import { getDb } from "./firebaseAdmin.js";

const confirmedBookingStatuses = new Set(["confirmed", "waiting", "in_chair"]);
const QUEUE_REINDEX_READ_LIMIT = 150;

const getTimestampMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value.toMillis) return value.toMillis();
  if (value.toDate) return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const minutesFromSlot = (slotValue = "") => {
  const [hour = "0", minute = "0"] = String(slotValue || "").split(":");
  return Number(hour) * 60 + Number(minute);
};

const getBookingSortMinutes = (booking) => {
  const minutes = minutesFromSlot(booking.timeSlot || "");
  return Number.isFinite(minutes) ? minutes : Number.MAX_SAFE_INTEGER - 2;
};

const sortBookingsForTurns = (bookings) =>
  [...bookings].sort((first, second) => {
    const slotDiff = getBookingSortMinutes(first) - getBookingSortMinutes(second);
    if (slotDiff) return slotDiff;

    const createdDiff =
      getTimestampMillis(first.createdSort || first.createdAt) -
      getTimestampMillis(second.createdSort || second.createdAt);
    if (createdDiff) return createdDiff;

    const firstPosition = Number(first.queuePosition || 0);
    const secondPosition = Number(second.queuePosition || 0);
    if (firstPosition || secondPosition) {
      if (!firstPosition) return 1;
      if (!secondPosition) return -1;
      if (firstPosition !== secondPosition) return firstPosition - secondPosition;
    }

    return String(first.id || "").localeCompare(String(second.id || ""));
  });

export const reindexQueueDate = async (bookingDate) => {
  const db = getDb();
  if (!db) {
    const error = new Error("Firebase Admin is not configured for queue reindex.");
    error.statusCode = 503;
    throw error;
  }

  const snapshot = await db
    .collection("customers")
    .where("bookingDate", "==", bookingDate)
    .limit(QUEUE_REINDEX_READ_LIMIT)
    .get();
  const bookings = snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ref: snapshotDoc.ref,
    ...snapshotDoc.data()
  }));
  const confirmedBookings = sortBookingsForTurns(
    bookings.filter((booking) =>
      confirmedBookingStatuses.has(String(booking.status || "").toLowerCase())
    )
  );
  const waitlistBookings = bookings.filter(
    (booking) => String(booking.status || "").toLowerCase() === "waitlist"
  );
  const batch = db.batch();

  confirmedBookings.forEach((booking, index) => {
    batch.set(
      booking.ref,
      {
        token: index + 1,
        peopleAhead: index,
        queuePosition: index + 1,
        turnSortMinutes: getBookingSortMinutes(booking),
        updatedAt: new Date()
      },
      { merge: true }
    );
  });

  waitlistBookings.forEach((booking) => {
    batch.set(
      booking.ref,
      {
        token: 0,
        peopleAhead: 0,
        queuePosition: 0,
        turnSortMinutes: Number.MAX_SAFE_INTEGER - 1,
        updatedAt: new Date()
      },
      { merge: true }
    );
  });

  const slotCounts = confirmedBookings.reduce((counts, booking) => {
    const slot = booking.timeSlot || "";
    if (slot) counts[slot] = (counts[slot] || 0) + 1;
    return counts;
  }, {});

  batch.set(
    db.collection("bookingCounters").doc(bookingDate),
    {
      bookingDate,
      confirmedCount: confirmedBookings.length,
      waitlistCount: waitlistBookings.length,
      slotCounts,
      updatedAt: new Date()
    },
    { merge: true }
  );

  await batch.commit();

  return {
    bookingDate,
    bookings: confirmedBookings.map((booking, index) => ({
      id: booking.id,
      status: booking.status,
      token: index + 1,
      peopleAhead: index,
      queuePosition: index + 1
    })),
    waitlistBookings: waitlistBookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      token: 0,
      peopleAhead: 0,
      queuePosition: 0
    })),
    confirmedCount: confirmedBookings.length,
    waitlistCount: waitlistBookings.length
  };
};
