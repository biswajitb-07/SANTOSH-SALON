import { getDb } from "./firebaseAdmin.js";
import { DAILY_BOOKING_LIMIT, WAITLIST_LIMIT } from "./bookingLimits.js";

const confirmedBookingStatuses = new Set(["confirmed", "waiting", "in_chair"]);
const QUEUE_REINDEX_READ_LIMIT = DAILY_BOOKING_LIMIT + WAITLIST_LIMIT + 40;

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
  let writeCount = 0;

  confirmedBookings.forEach((booking, index) => {
    const nextTurnSortMinutes = getBookingSortMinutes(booking);
    if (
      Number(booking.token || 0) === index + 1 &&
      Number(booking.peopleAhead || 0) === index &&
      Number(booking.queuePosition || 0) === index + 1 &&
      Number(booking.turnSortMinutes || 0) === nextTurnSortMinutes
    ) {
      return;
    }

    batch.set(
      booking.ref,
      {
        token: index + 1,
        peopleAhead: index,
        queuePosition: index + 1,
        turnSortMinutes: nextTurnSortMinutes,
        updatedAt: new Date()
      },
      { merge: true }
    );
    writeCount += 1;
  });

  waitlistBookings.forEach((booking) => {
    const nextTurnSortMinutes = Number.MAX_SAFE_INTEGER - 1;
    if (
      Number(booking.token || 0) === 0 &&
      Number(booking.peopleAhead || 0) === 0 &&
      Number(booking.queuePosition || 0) === 0 &&
      Number(booking.turnSortMinutes || 0) === nextTurnSortMinutes
    ) {
      return;
    }

    batch.set(
      booking.ref,
      {
        token: 0,
        peopleAhead: 0,
        queuePosition: 0,
        turnSortMinutes: nextTurnSortMinutes,
        updatedAt: new Date()
      },
      { merge: true }
    );
    writeCount += 1;
  });

  const slotCounts = confirmedBookings.reduce((counts, booking) => {
    const slot = booking.timeSlot || "";
    if (slot) counts[slot] = (counts[slot] || 0) + 1;
    return counts;
  }, {});

  const counterRef = db.collection("bookingCounters").doc(bookingDate);
  const counterSnapshot = await counterRef.get();
  const counter = counterSnapshot.exists ? counterSnapshot.data() || {} : {};
  const counterUnchanged =
    Number(counter.confirmedCount || 0) === confirmedBookings.length &&
    Number(counter.waitlistCount || 0) === waitlistBookings.length &&
    JSON.stringify(counter.slotCounts || {}) === JSON.stringify(slotCounts);
  if (!counterUnchanged) {
    batch.set(
      counterRef,
      {
        bookingDate,
        confirmedCount: confirmedBookings.length,
        waitlistCount: waitlistBookings.length,
        slotCounts,
        updatedAt: new Date()
      },
      { merge: true }
    );
    writeCount += 1;
  }

  if (writeCount > 0) {
    await batch.commit();
  }

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
    waitlistCount: waitlistBookings.length,
    writeCount
  };
};
