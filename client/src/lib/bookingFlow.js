import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query as firestoreQuery,
  where
} from "firebase/firestore";
import { db } from "./firebase.js";
import { getSafeErrorMessage } from "./errors.js";
import { getServiceImageUrl } from "./services.js";

export const SALON_SLUG = import.meta.env.VITE_SALON_SLUG || "santosh";
export const BOOKING_CLOSED_MESSAGE =
  "Booking is currently closed by the owner. Please try again later.";
export const STAFF_COUNT = 3;
export const DAILY_CONFIRMED_LIMIT = 35;
export const WAITLIST_LIMIT = 10;
export const USER_BOOKING_HISTORY_LIMIT = 5;
export const BOOKING_DAY_STATS_READ_LIMIT = 120;
export const PLATFORM_FEE_PER_PERSON = 2;
export const BARBER_OPTIONS = [
  "Next available barber",
  "Santosh",
  "Haircut specialist",
  "Beard stylist"
];
export const DEFAULT_BARBER_NAMES = ["Santosh", "Haircut specialist", "Beard stylist"];
export const DEFAULT_BARBER_PLACEHOLDERS = [
  "/assets/owner-santosh-portrait.png",
  "https://images.pexels.com/photos/2061820/pexels-photo-2061820.jpeg?auto=compress&cs=tinysrgb&w=900",
  "https://images.pexels.com/photos/2881253/pexels-photo-2881253.jpeg?auto=compress&cs=tinysrgb&w=900"
];
export const DEFAULT_COUPONS = {
  WELCOME10: { label: "Welcome offer", percent: 10 },
  SALON20: { label: "Salon special", type: "amount", amount: 20 }
};
export const ONLINE_BOOKING_START_HOUR = 6;
export const SLOT_START_HOUR = 7;
export const BOOKING_END_HOUR = 23;
export const LUNCH_START_HOUR = 13;
export const LUNCH_END_HOUR = 14;
export const SLOT_MINUTES = 30;
export const activeBookingStatuses = new Set([
  "confirmed",
  "waiting",
  "in_chair",
  "waitlist"
]);
export const confirmedBookingStatuses = new Set(["confirmed", "waiting", "in_chair"]);

export const getSafeBarberImageUrl = (imageUrl) => {
  if (!imageUrl) return "";
  if (
    imageUrl.includes("source.unsplash.com") ||
    imageUrl.includes("pollinations.ai") ||
    imageUrl.includes("pexels-photo-6623694") ||
    imageUrl.includes("/images/barbers/")
  ) {
    return "";
  }
  return imageUrl;
};

export const getTimestampMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value.toMillis) return value.toMillis();
  if (value.toDate) return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export const minutesFromSlot = (slotValue = "") => {
  const [hour = "0", minute = "0"] = slotValue.split(":");
  return Number(hour) * 60 + Number(minute);
};

export const getBookingSortMinutes = (booking) => {
  const status = String(booking.status || "").toLowerCase();
  if (status === "waitlist") return Number.MAX_SAFE_INTEGER - 1;
  const minutes = minutesFromSlot(booking.timeSlot || "");
  return Number.isFinite(minutes) ? minutes : Number.MAX_SAFE_INTEGER - 2;
};

export const sortBookingsForTurns = (bookings) =>
  [...bookings].sort((first, second) => {
    const firstStatus = String(first.status || "").toLowerCase();
    const secondStatus = String(second.status || "").toLowerCase();
    const firstWaitlist = firstStatus === "waitlist" ? 1 : 0;
    const secondWaitlist = secondStatus === "waitlist" ? 1 : 0;
    if (firstWaitlist !== secondWaitlist) return firstWaitlist - secondWaitlist;

    const slotDiff =
      getBookingSortMinutes(first) - getBookingSortMinutes(second);
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

export const loadCashfreeCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Cashfree checkout failed to load"));
    document.body.appendChild(script);
  });

export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const formatSlotTime = (hour, minute) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

export const parseTimeToMinutes = (timeValue, fallbackHour) => {
  const [hour = fallbackHour, minute = 0] = String(timeValue || "")
    .split(":")
    .map((value) => Number(value));
  const safeHour = Number.isFinite(hour) ? hour : fallbackHour;
  const safeMinute = Number.isFinite(minute) ? minute : 0;
  return safeHour * 60 + safeMinute;
};

export const createTimeSlots = (openingTime = "07:00", closingTime = "23:00") => {
  const slots = [];
  let openingMinutes = parseTimeToMinutes(openingTime, SLOT_START_HOUR);
  let closingMinutes = parseTimeToMinutes(closingTime, BOOKING_END_HOUR);

  if (closingMinutes <= openingMinutes) {
    openingMinutes = SLOT_START_HOUR * 60;
    closingMinutes = BOOKING_END_HOUR * 60;
  }

  for (
    let slotMinutes = openingMinutes;
    slotMinutes < closingMinutes;
    slotMinutes += SLOT_MINUTES
  ) {
    const hour = Math.floor(slotMinutes / 60);
    const minute = slotMinutes % 60;
    if (hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR) continue;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0"
    )}`;
    slots.push({
      value,
      label: formatSlotTime(hour, minute)
    });
  }

  return slots;
};

export const timeSlots = createTimeSlots();

export const formatTimeValue = (timeValue, fallbackHour) => {
  const minutes = parseTimeToMinutes(timeValue, fallbackHour);
  return formatSlotTime(Math.floor(minutes / 60), minutes % 60);
};

export const getVisibleTimeSlots = (bookingDay, slots = timeSlots) => {
  if (bookingDay !== "today") return slots;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((slot) => minutesFromSlot(slot.value) > currentMinutes);
};

export const getBookingWindowMessage = (gate = {}) =>
  `Online booking is open from ${formatTimeValue(
    null,
    ONLINE_BOOKING_START_HOUR
  )} to ${formatTimeValue(
    gate.closingTime,
    BOOKING_END_HOUR
  )}. First haircut slot starts at ${formatTimeValue(
    gate.openingTime,
    SLOT_START_HOUR
  )}. Lunch/rest break is 1 PM to 2 PM.`;

export const isCustomerBookingWindowOpen = (gate = {}) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openingMinutes = ONLINE_BOOKING_START_HOUR * 60;
  const closingMinutes = parseTimeToMinutes(gate.closingTime, BOOKING_END_HOUR);
  return currentMinutes >= openingMinutes && currentMinutes < closingMinutes;
};

export function getBookingOption(day) {
  const date = new Date();
  if (day === "tomorrow") date.setDate(date.getDate() + 1);

  return {
    day,
    label: day === "tomorrow" ? "Tomorrow" : "Today",
    date: toDateInputValue(date),
    displayDate: date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })
  };
}

export const getRequestErrorMessage = (error, fallback) =>
  getSafeErrorMessage(
    error?.data?.error ||
      error?.error ||
      error?.message ||
      error?.details?.error?.description,
    fallback
  );

export const getCashfreeChargePreview = (amount, peopleCount = 1) => {
  const serviceAmount =
    Math.round(Number(amount || 0) * Number(peopleCount || 1) * 100) / 100;
  const cashfreeFee = Math.round(serviceAmount * 1.6) / 100;
  const payableAmount = Math.round((serviceAmount + cashfreeFee) * 100) / 100;

  return {
    serviceAmount,
    cashfreeFee,
    payableAmount
  };
};

export const getCouponDiscount = (
  code,
  amount,
  peopleCount = 1,
  coupons = DEFAULT_COUPONS
) => {
  const coupon = coupons[String(code || "").trim().toUpperCase()];
  if (!coupon || coupon.active === false) return 0;
  const total = Number(amount || 0) * Number(peopleCount || 1);
  if (coupon.condition === "min" && total < Number(coupon.minAmount || 0)) return 0;
  if (coupon.condition === "max" && total > Number(coupon.maxAmount || 0)) return 0;
  if (coupon.type === "amount") {
    const couponAmount = Math.max(0, Number(coupon.amount || 0));
    return Math.min(total, couponAmount);
  }
  const percent = Math.max(0, Number(coupon.percent || 0));
  return percent ? Math.round(total * percent) / 100 : 0;
};

export const getSalonBarberNames = (salon = {}) => {
  const names = Array.isArray(salon.barbers)
    ? salon.barbers
        .filter((barber) => barber?.active !== false && barber?.name)
        .map((barber) => barber.name.trim())
        .filter(Boolean)
    : [];
  return names.length ? [...new Set(names)] : DEFAULT_BARBER_NAMES;
};

export const normalizeBarberAvailability = (
  salon = {},
  dateValue = toDateInputValue(new Date())
) =>
  getSalonBarberNames(salon).map((name, index) => {
    const schedule = salon.barberAvailability?.[name];
    const legacyAvailable = salon.staffAttendance?.[name];
    const unavailableDates = Array.isArray(schedule?.unavailableDates)
      ? schedule.unavailableDates
      : [];
    const available =
      schedule?.available !== undefined
        ? schedule.available !== false
        : legacyAvailable !== false;

    return {
      name,
      available: available && !unavailableDates.includes(dateValue),
      imageUrl:
        (Array.isArray(salon.barbers)
          ? getSafeBarberImageUrl(
              salon.barbers.find((barber) => barber?.name === name)?.imageUrl
            )
          : "") ||
        DEFAULT_BARBER_PLACEHOLDERS[index % DEFAULT_BARBER_PLACEHOLDERS.length],
      imagePublicId: Array.isArray(salon.barbers)
        ? salon.barbers.find((barber) => barber?.name === name)?.imagePublicId || ""
        : "",
      unavailableDates
    };
  });

export const normalizeService = (snapshotDoc) => {
  const data = snapshotDoc.data();
  const amount = Number(data.amount || data.priceAmount || 0);

  return {
    id: snapshotDoc.id,
    title: data.title || "Salon Service",
    time: data.time || "25 min",
    price: data.price || `Rs. ${amount || 0}`,
    amount,
    imageUrl: data.imageUrl || getServiceImageUrl(data.title),
    sortOrder: Number(data.sortOrder || 999),
    active: data.active !== false
  };
};

export const normalizeQueueItem = (snapshotDoc, displayToken) => {
  const data = snapshotDoc.data();
  const status = data.status || "waiting";
  const createdAtDate = data.createdAt?.toDate?.();

  return {
    id: snapshotDoc.id,
    token: displayToken || data.token || "-",
    queuePosition: Number(data.queuePosition || 0),
    name: data.name || "Customer",
    barberName: data.barberName || data.preferredBarber || "Next available barber",
    status: status.replace(/_/g, " "),
    eta:
      status === "in_chair"
        ? "Now"
        : createdAtDate
          ? createdAtDate.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "Live"
  };
};

export const getBookingDayStats = async (bookingDate, slots = timeSlots) => {
  const bookingSnapshot = await getDocs(
    firestoreQuery(
      collection(db, "customers"),
      where("bookingDate", "==", bookingDate),
      limit(BOOKING_DAY_STATS_READ_LIMIT)
    )
  );
  const bookings = bookingSnapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data()
  }));
  const slotCounts = bookings.reduce((counts, booking) => {
    const status = String(booking.status || "").toLowerCase();
    if (!confirmedBookingStatuses.has(status)) return counts;

    const slot = booking.timeSlot || "";
    if (slot) counts[slot] = (counts[slot] || 0) + 1;
    return counts;
  }, {});
  const confirmedCount = bookings.filter((booking) =>
    confirmedBookingStatuses.has(String(booking.status || "").toLowerCase())
  ).length;
  const waitlistCount = bookings.filter(
    (booking) => String(booking.status || "").toLowerCase() === "waitlist"
  ).length;

  return {
    bookings,
    confirmedCount,
    waitlistCount,
    availableSlots: slots.filter(
      (slot) => (slotCounts[slot.value] || 0) < STAFF_COUNT
    ),
    slotCounts
  };
};

export const getActiveUserBookings = async (userId) => {
  const bookingSnapshot = await getDocs(
    firestoreQuery(
      collection(db, "customers"),
      where("userId", "==", userId),
      where("status", "in", [...activeBookingStatuses])
    )
  );

  return bookingSnapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data()
  }));
};

export const pruneUserBookingHistory = async (userId) => {
  const bookingSnapshot = await getDocs(
    firestoreQuery(
      collection(db, "customers"),
      where("userId", "==", userId),
      limit(60)
    )
  );
  const inactiveStatuses = new Set([
    "completed",
    "cancelled",
    "skipped",
    "no_show"
  ]);
  const groups = bookingSnapshot.docs.reduce((accumulator, snapshotDoc) => {
    const data = snapshotDoc.data();
    const groupId = data.bookingGroupId || snapshotDoc.id;
    const group = accumulator[groupId] || {
      key: groupId,
      docs: [],
      latestSort: 0,
      hasActive: false
    };
    const status = String(data.status || "").toLowerCase();
    const createdSort =
      Number(data.createdSort || 0) ||
      data.createdAt?.toMillis?.() ||
      data.createdAt?.toDate?.()?.getTime?.() ||
      0;
    group.docs.push(snapshotDoc);
    group.latestSort = Math.max(group.latestSort, createdSort);
    group.hasActive = group.hasActive || !inactiveStatuses.has(status);
    accumulator[groupId] = group;
    return accumulator;
  }, {});

  const oldInactiveGroups = Object.values(groups)
    .sort((first, second) => second.latestSort - first.latestSort)
    .slice(USER_BOOKING_HISTORY_LIMIT)
    .filter((group) => !group.hasActive);

  await Promise.all(
    oldInactiveGroups.flatMap((group) =>
      group.docs.map((snapshotDoc) => deleteDoc(doc(db, "customers", snapshotDoc.id)))
    )
  );
};
