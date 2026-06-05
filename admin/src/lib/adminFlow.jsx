import React from "react";
import {
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  QrCode,
  Settings,
  Sparkles,
  UserCheck,
  UserRound,
  UsersRound,
  WalletCards
} from "lucide-react";
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const STAFF_COUNT = 3;
export const PLATFORM_FEE_PER_PERSON = 2;
export const DEFAULT_BARBER_NAMES = ["Santosh", "Haircut specialist", "Beard stylist"];
export const DEFAULT_BARBER_PLACEHOLDERS = [
  "/assets/owner-santosh-portrait.png",
  "https://images.pexels.com/photos/2061820/pexels-photo-2061820.jpeg?auto=compress&cs=tinysrgb&w=900",
  "https://images.pexels.com/photos/2881253/pexels-photo-2881253.jpeg?auto=compress&cs=tinysrgb&w=900"
];
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
export const getBarberStatsId = (barberName = "") =>
  String(barberName || "barber")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "barber";
export const DAILY_CONFIRMED_LIMIT = 50;
export const SLOT_START_HOUR = 7;
export const BOOKING_END_HOUR = 23;
export const LUNCH_START_HOUR = 13;
export const LUNCH_END_HOUR = 14;
export const SLOT_MINUTES = 30;
export const confirmedBookingStatuses = new Set(["confirmed", "waiting", "in_chair"]);
export const activeTransferStatuses = new Set(["confirmed", "waiting", "in_chair", "waitlist"]);
export const ADMIN_PAGE_SIZE = 6;
export const SERVICE_PAGE_SIZE = 8;
export const queueStatusTabs = [
  { key: "booking", label: "Confirmed", statuses: ["confirmed", "waiting"] },
  { key: "waitlist", label: "Waiting", statuses: ["waitlist"] },
  { key: "in_chair", label: "In Chair", statuses: ["in_chair"] },
  { key: "completed", label: "Complete", statuses: ["completed"] },
  { key: "skipped", label: "Skip", statuses: ["skipped"] }
];

export const CLIENT_URL =
  import.meta.env.VITE_CLIENT_URL ||
  "https://santosh-salon.web.app";
export const ADMIN_ALLOWED_EMAILS = (import.meta.env.VITE_ADMIN_ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const loadRazorpayCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay checkout failed to load"));
    document.body.appendChild(script);
  });

export const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "queue", label: "Queue", icon: UsersRound },
  { key: "barbers", label: "Barbers", icon: UserRound },
  { key: "services", label: "Haircut Design", icon: Sparkles },
  { key: "refunds", label: "Refunds", icon: CreditCard },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "users", label: "Users", icon: UserCheck },
  { key: "public-link", label: "Public Link", icon: QrCode },
  { key: "plans", label: "Plans", icon: WalletCards },
  { key: "settings", label: "Settings", icon: Settings }
];

export const defaultSalonProfile = {
  name: "Santosh Salon",
  slug: "santosh",
  phone: "+91 98765 43210",
  address: "Main Market Road, Near City Chowk",
  openingTime: "07:00",
  closingTime: "23:00",
  barbers: DEFAULT_BARBER_NAMES.map((name) => ({
    name,
    active: true,
    imageUrl: "",
    imagePublicId: ""
  })),
  staffAttendance: {
    Santosh: true,
    "Haircut specialist": true,
    "Beard stylist": true
  },
  barberAvailability: {
    Santosh: { available: true, unavailableDates: [] },
    "Haircut specialist": { available: true, unavailableDates: [] },
    "Beard stylist": { available: true, unavailableDates: [] }
  },
  coupons: {
    WELCOME10: { label: "Welcome offer", type: "percent", percent: 10, active: true, condition: "all" },
    SALON20: { label: "Salon special", type: "amount", amount: 20, active: true, condition: "all" }
  },
  manualShopClosed: false,
  manualCloseReason: ""
};

export const defaultServiceDraft = {
  title: "",
  time: "25 min",
  amount: 120,
  imageUrl: "",
  imagePublicId: "",
  imageFile: null,
  imagePreview: "",
  active: true
};

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
    if (hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR) {
      continue;
    }
    slots.push({
      value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(
        2,
        "0"
      )}`,
      label: formatSlotTime(hour, minute)
    });
  }

  return slots;
};

export const timeSlots = createTimeSlots();

export const minutesFromSlot = (slotValue = "") => {
  const [hour = "0", minute = "0"] = slotValue.split(":");
  return Number(hour) * 60 + Number(minute);
};

export const getTimestampMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value.toMillis) return value.toMillis();
  if (value.toDate) return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export const getBookingSortMinutes = (booking) => {
  const status = String(booking.status || "").toLowerCase();
  if (status === "waitlist") return Number.MAX_SAFE_INTEGER - 1;
  const minutes = minutesFromSlot(booking.timeSlot || "");
  return Number.isFinite(minutes) ? minutes : Number.MAX_SAFE_INTEGER - 2;
};

export const sortBookingsForTurns = (bookings) =>
  [...bookings].sort((first, second) => {
    const firstDate = first.bookingDate || "";
    const secondDate = second.bookingDate || "";
    if (firstDate !== secondDate) return firstDate.localeCompare(secondDate);

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

export const getVisibleAdminTimeSlots = (
  bookingDate = toDateInputValue(new Date()),
  slots = timeSlots
) => {
  const today = toDateInputValue(new Date());
  if (!bookingDate || bookingDate < today) return [];
  if (bookingDate > today) return slots;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((slot) => minutesFromSlot(slot.value) > currentMinutes);
};

export const getDisplayDate = (dateValue) => {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

export const getTomorrowDateValue = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDateInputValue(date);
};

export const getRecentDateValues = (days = 7) => {
  const today = new Date();

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return toDateInputValue(date);
  });
};

export const getShortDayLabel = (dateValue) =>
  new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short"
  });

export const serviceChartColors = [
  "#991b1b",
  "#f97316",
  "#0ea5e9",
  "#eab308",
  "#7c3aed",
  "#dc2626"
];

export const shouldCountRevenue = (item) => {
  const status = String(item.status || "").toLowerCase();
  const paymentStatus = String(item.paymentStatus || "").toLowerCase();

  if (["cancelled", "skipped", "waitlist"].includes(status)) return false;
  if (["paid", "admin_created"].includes(paymentStatus)) return true;
  return false;
};

export const hasChartValue = (data, keys) =>
  data.some((item) => keys.some((key) => Number(item[key] || 0) > 0));

export const ChartEmpty = ({ title, text, className = "h-48" }) => (
  <div
    className={`grid place-items-center rounded-3xl bg-[#101a18] px-5 text-center ${className}`}
  >
    <div>
      <p className="font-black text-[#f4fbf8]">{title}</p>
      <p className="mt-1 text-sm font-bold text-[#9db2ad]">{text}</p>
    </div>
  </div>
);

export const normalizeCustomer = (snapshotDoc, displayToken) => {
  const data = snapshotDoc.data();
  const bookingLabel =
    data.bookingLabel && data.bookingDisplayDate
      ? `${data.bookingLabel}, ${data.bookingDisplayDate}`
      : data.bookingDate || "Today";

  return {
    id: snapshotDoc.id,
    token: displayToken || data.token || "-",
    storedToken: data.token || "-",
    name: data.name || "Customer",
    phone: data.mobile || data.phone || "-",
    service: data.service || "Service",
    bookingDate: data.bookingDate || "",
    bookingDay: data.bookingDay || "today",
    bookingLabel,
    timeSlot: data.timeSlot || "",
    timeSlotLabel: data.timeSlotLabel || "",
    status: data.status || "waiting",
    amount: data.amount || 0,
    paidAmount: data.paidAmount || data.amount || 0,
    cashfreeFee: data.cashfreeFee || data.nonRefundableFee || 0,
    paymentProvider: data.paymentProvider || "-",
    paymentStatus: data.paymentStatus || "-",
    userId: data.userId || "",
    email: data.email || data.customerEmail || "",
    peopleAhead: Number(data.peopleAhead || 0),
    queuePosition: Number(data.queuePosition || 0),
    barberName: data.barberName || data.preferredBarber || "Next available barber",
    barberRating: Number(data.barberRating || 0),
    barberReview: data.barberReview || "",
    cancelReason: data.cancelReason || "",
    notifiedAt: data.notifiedAt || null,
    createdAt: data.createdAt,
    createdSort: data.createdSort || 0
  };
};

export const normalizeService = (snapshotDoc) => {
  const data = snapshotDoc.data();
  const amount = Number(data.amount || 0);

  return {
    id: snapshotDoc.id,
    title: data.title || "Salon Service",
    time: data.time || "25 min",
    amount,
    price: data.price || `Rs. ${amount}`,
    imageUrl: data.imageUrl || "",
    imagePublicId: data.imagePublicId || "",
    sortOrder: Number(data.sortOrder || 999),
    active: data.active !== false
  };
};

export const normalizeUser = (snapshotDoc) => {
  const data = snapshotDoc.data();

  return {
    id: snapshotDoc.id,
    uid: data.uid || snapshotDoc.id,
    name: data.name || "Customer",
    email: data.email || "-",
    phone: data.phone || data.mobile || "-",
    photoURL: data.photoURL || "",
    provider: data.provider || "google.com",
    blocked: data.blocked === true,
    updatedAt: data.updatedAt
  };
};

export const normalizeRefund = (snapshotDoc) => {
  const data = snapshotDoc.data();
  const createdAtDate = data.createdAt?.toDate?.() || null;
  const updatedAtDate = data.updatedAt?.toDate?.() || null;

  return {
    id: snapshotDoc.id,
    customerName: data.customerName || "Customer",
    customerEmail: data.customerEmail || "-",
    customerMobile: data.customerMobile || "-",
    bookingGroupId: data.bookingGroupId || "",
    bookingGroupIndex: data.bookingGroupIndex || 1,
    bookingGroupSize: data.bookingGroupSize || 1,
    refundScope: data.refundScope || "single_booking",
    partialRefund: data.partialRefund !== false,
    bookingId: data.bookingId || "",
    paymentId: data.paymentId || "-",
    transactionId: data.transactionId || "-",
    orderId: data.orderId || "-",
    amount: data.amount || 0,
    reason: data.reason || "-",
    refundMethod: data.refundMethod || "upi",
    upiId: data.upiId || "",
    bankDetails: data.bankDetails || null,
    status: data.status || "requested",
    expectedWindow: data.expectedWindow || "5-7 business days",
    refundDetails: data.refundDetails || null,
    cashfree: data.cashfree || null,
    adminRefundNote: data.adminRefundNote || "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdDateValue: createdAtDate ? toDateInputValue(createdAtDate) : "",
    updatedDateValue: updatedAtDate ? toDateInputValue(updatedAtDate) : ""
  };
};

export const statusLabel = (status) =>
  ({
    waiting: "Confirmed",
    waitlist: "Waiting",
    in_chair: "In Chair",
    skipped: "Skipped",
    completed: "Completed",
    cancelled: "Cancelled"
  })[String(status || "waiting").toLowerCase()] ||
  String(status || "waiting")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const statusTone = (status) =>
  String(status || "pending")
    .toLowerCase()
    .replace(/\s+/g, "_");

export const getProfileBarberNames = (profile = defaultSalonProfile) => {
  const names = Array.isArray(profile.barbers)
    ? profile.barbers
        .filter((barber) => barber?.active !== false && barber?.name)
        .map((barber) => barber.name.trim())
        .filter(Boolean)
    : [];
  return names.length ? [...new Set(names)] : DEFAULT_BARBER_NAMES;
};

export const getProfileBarbers = (profile = defaultSalonProfile) => {
  const barbers = Array.isArray(profile.barbers)
    ? profile.barbers
        .map((barber, index) => ({
          name: String(barber?.name || "").trim(),
          active: barber?.active !== false,
          imageUrl:
            getSafeBarberImageUrl(barber?.imageUrl) ||
            DEFAULT_BARBER_PLACEHOLDERS[index % DEFAULT_BARBER_PLACEHOLDERS.length],
          imagePublicId: barber?.imagePublicId || ""
        }))
        .filter((barber) => barber.name)
    : [];

  return barbers.length
    ? barbers
    : DEFAULT_BARBER_NAMES.map((name, index) => ({
        name,
        active: true,
        imageUrl: DEFAULT_BARBER_PLACEHOLDERS[index % DEFAULT_BARBER_PLACEHOLDERS.length],
        imagePublicId: ""
      }));
};

export const getBarberAvailabilityForDate = (profile = defaultSalonProfile, dateValue) =>
  getProfileBarberNames(profile).map((name) => {
    const schedule = profile.barberAvailability?.[name] || {};
    const unavailableDates = Array.isArray(schedule.unavailableDates)
      ? schedule.unavailableDates
      : [];
    const legacyAvailable = profile.staffAttendance?.[name];
    const baseAvailable =
      schedule.available !== undefined
        ? schedule.available !== false
        : legacyAvailable !== false;

    return {
      name,
      available: baseAvailable && !unavailableDates.includes(dateValue),
      unavailableDates
    };
  });

export const getRequestErrorMessage = (error, fallback) =>
  error?.data?.error ||
  error?.error ||
  error?.message ||
  error?.details?.error?.description ||
  fallback;

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });

export const getPremiumUntilDate = (profile) => {
  const timestamp = profile?.premiumUntil;
  if (!timestamp) return null;
  if (timestamp?.toDate) return timestamp.toDate();

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isPremiumActive = (profile) => {
  const premiumUntil = getPremiumUntilDate(profile);
  return (
    profile?.premiumEnabled === true &&
    profile?.paymentStatus === "active" &&
    (!premiumUntil || premiumUntil.getTime() > Date.now())
  );
};

export const formatDateTime = (date) =>
  date
    ? date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";
