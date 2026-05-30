import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Toaster, toast } from "sonner";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query as firestoreQuery,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Download,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { auth, db, googleProvider } from "./lib/firebase.js";
import {
  useCreateCustomerPaymentOrderMutation,
  useVerifyCustomerPaymentMutation
} from "./store/api/customerPaymentsApi.js";
import { store } from "./store/store.js";
import "./styles.css";

const serviceFallbackImages = {
  beard: "/assets/haircut-styles.png",
  facial: "/assets/salon-hero.png",
  haircut: "/assets/haircut-feature.png",
  "hair wash": "/assets/haircut-styles.png"
};

const getServiceImageUrl = (title = "") => {
  const value = title.toLowerCase();
  const match = Object.entries(serviceFallbackImages).find(([keyword]) =>
    value.includes(keyword)
  );

  return match?.[1] || "/assets/haircut-feature.png";
};

const defaultServices = [
  {
    title: "Classic Haircut",
    time: "25 min",
    price: "Rs. 120",
    amount: 120,
    imageUrl: getServiceImageUrl("Classic Haircut")
  },
  {
    title: "Beard Styling",
    time: "15 min",
    price: "Rs. 80",
    amount: 80,
    imageUrl: getServiceImageUrl("Beard Styling")
  },
  {
    title: "Hair Wash",
    time: "12 min",
    price: "Rs. 70",
    amount: 70,
    imageUrl: getServiceImageUrl("Hair Wash")
  },
  {
    title: "Facial Grooming",
    time: "35 min",
    price: "Rs. 250",
    amount: 250,
    imageUrl: getServiceImageUrl("Facial Grooming")
  }
];

const pages = ["home", "booking", "about", "contact"];
const legalPages = [
  "privacy-policy",
  "terms-and-conditions",
  "cancellation-refund-policy",
  "payment-policy"
];
const routedPages = [...pages, "profile", ...legalPages];
const SALON_SLUG = import.meta.env.VITE_SALON_SLUG || "santosh";
const BOOKING_CLOSED_MESSAGE =
  "Booking is currently closed by the owner. Please try again later.";
const STAFF_COUNT = 3;
const DAILY_CONFIRMED_LIMIT = 35;
const WAITLIST_LIMIT = 10;
const SERVICE_PAGE_SIZE = 8;
const BOOKING_PAGE_SIZE = 4;
const BOOKING_START_HOUR = 7;
const BOOKING_END_HOUR = 23;
const LUNCH_START_HOUR = 13;
const LUNCH_END_HOUR = 14;
const SLOT_MINUTES = 30;
const activeBookingStatuses = new Set(["waiting", "in_chair", "waitlist"]);
const confirmedBookingStatuses = new Set(["waiting", "in_chair"]);

const getClientRoute = () => {
  if (typeof window === "undefined") {
    return { page: "home", tab: "account" };
  }

  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  const tab = params.get("tab");

  return {
    page: routedPages.includes(page) ? page : "home",
    tab: tab === "bookings" ? "bookings" : "account"
  };
};

const writeClientRoute = ({ page, tab }, replace = false) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set("page", page);
  if (page === "profile") {
    url.searchParams.set("tab", tab === "bookings" ? "bookings" : "account");
  } else {
    url.searchParams.delete("tab");
  }

  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
};

const loadCashfreeCheckout = () =>
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

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const formatSlotTime = (hour, minute) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

const createTimeSlots = () => {
  const slots = [];

  for (let hour = BOOKING_START_HOUR; hour < BOOKING_END_HOUR; hour += 1) {
    if (hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR) continue;

    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
        2,
        "0"
      )}`;
      slots.push({
        value,
        label: formatSlotTime(hour, minute)
      });
    }
  }

  return slots;
};

const timeSlots = createTimeSlots();

const minutesFromSlot = (slotValue = "") => {
  const [hour = "0", minute = "0"] = slotValue.split(":");
  return Number(hour) * 60 + Number(minute);
};

const parseTimeToMinutes = (timeValue, fallbackHour) => {
  const [hour = fallbackHour, minute = 0] = String(timeValue || "")
    .split(":")
    .map((value) => Number(value));
  const safeHour = Number.isFinite(hour) ? hour : fallbackHour;
  const safeMinute = Number.isFinite(minute) ? minute : 0;
  return safeHour * 60 + safeMinute;
};

const formatTimeValue = (timeValue, fallbackHour) => {
  const minutes = parseTimeToMinutes(timeValue, fallbackHour);
  return formatSlotTime(Math.floor(minutes / 60), minutes % 60);
};

const getVisibleTimeSlots = (bookingDay, slots = timeSlots) => {
  if (bookingDay !== "today") return slots;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((slot) => minutesFromSlot(slot.value) > currentMinutes);
};

const getBookingWindowMessage = (gate = {}) =>
  `Online booking is open from ${formatTimeValue(
    gate.openingTime,
    BOOKING_START_HOUR
  )} to ${formatTimeValue(
    gate.closingTime,
    BOOKING_END_HOUR
  )}. Lunch/rest break is 1 PM to 2 PM.`;

const isCustomerBookingWindowOpen = (gate = {}) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openingMinutes = parseTimeToMinutes(gate.openingTime, BOOKING_START_HOUR);
  const closingMinutes = parseTimeToMinutes(gate.closingTime, BOOKING_END_HOUR);
  return currentMinutes >= openingMinutes && currentMinutes < closingMinutes;
};

function getBookingOption(day) {
  const date = new Date();
  if (day === "tomorrow") {
    date.setDate(date.getDate() + 1);
  }

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

function titleCase(value) {
  if (value === "about") return "About Us";
  if (value === "contact") return "Contact Us";
  if (value === "refund") return "Refund";
  if (value === "profile") return "Profile";
  if (value === "privacy-policy") return "Privacy Policy";
  if (value === "terms-and-conditions") return "Terms";
  if (value === "cancellation-refund-policy") return "Refund Policy";
  if (value === "payment-policy") return "Payment Policy";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const getRequestErrorMessage = (error, fallback) =>
  error?.data?.error ||
  error?.error ||
  error?.message ||
  error?.details?.error?.description ||
  fallback;

const formatMoney = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
const escapeInvoiceValue = (value) =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const downloadBookingInvoice = (booking, user, refund = null) => {
  const isRefundInvoice = Boolean(refund);
  const invoiceNo = `${isRefundInvoice ? "SSQ-REF" : "SSQ"}-${String(
    refund?.id || booking.id || Date.now()
  )
    .slice(0, 10)
    .toUpperCase()}`;
  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const rows = [
    ["Invoice No", invoiceNo],
    ["Generated At", generatedAt],
    ["Customer", user?.displayName || "Customer"],
    ["Email", user?.email || "-"],
    ["Mobile", booking.mobile || "-"],
    ["Token", booking.token],
    ["Service", booking.service],
    ["Booking", booking.bookingLabel],
    ["Time Slot", booking.timeSlotLabel || booking.timeSlot || "-"],
    ["Booking Status", formatBookingStatus(booking.status)],
    ["Payment Method", formatStatus(booking.paymentProvider)],
    ["Payment Status", formatStatus(booking.paymentStatus)],
    ["Payment ID", booking.paymentId || "-"],
    ["Transaction ID", booking.transactionId || "-"],
    ["Order ID", booking.orderId || "-"],
    ...(isRefundInvoice
      ? [
          ["Refund Status", formatStatus(refund.status)],
          ["Refund Request ID", refund.id || "-"],
          ["Refund Method", "Original payment method"],
          ["Refund Amount", formatMoney(refund.amount || booking.amount)]
        ]
      : [["Amount Paid", formatMoney(booking.amount)]])
  ];
  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><th>${escapeInvoiceValue(label)}</th><td>${escapeInvoiceValue(value)}</td></tr>`
    )
    .join("");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeInvoiceValue(invoiceNo)}</title>
  <style>
    body { margin: 0; background: #f6faf8; color: #173734; font-family: Arial, sans-serif; }
    .invoice { max-width: 780px; margin: 32px auto; background: #fff; border-radius: 24px; padding: 32px; box-shadow: 0 24px 80px rgba(23,55,52,.12); }
    .top { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #d9e5df; padding-bottom: 20px; }
    .brand { color: #0f766e; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; font-size: 13px; }
    h1 { margin: 8px 0 0; font-size: 34px; }
    .badge { display: inline-block; border-radius: 999px; background: #ecfdf5; color: #0f766e; font-weight: 900; padding: 10px 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #edf3ef; padding: 13px 8px; text-align: left; vertical-align: top; }
    th { width: 210px; color: #637371; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
    td { font-weight: 800; word-break: break-word; }
    .total { margin-top: 24px; border-radius: 18px; background: #173734; color: #fff; padding: 18px; font-size: 22px; font-weight: 900; text-align: right; }
    .note { margin-top: 20px; color: #637371; font-size: 13px; line-height: 1.7; }
    @media print { body { background: #fff; } .invoice { margin: 0; box-shadow: none; border-radius: 0; } }
  </style>
</head>
<body>
  <main class="invoice">
    <section class="top">
      <div>
        <div class="brand">Santosh Salon Queue</div>
        <h1>${isRefundInvoice ? "Refund Invoice" : "Booking Invoice"}</h1>
      </div>
      <span class="badge">${escapeInvoiceValue(
        isRefundInvoice ? formatStatus(refund.status) : formatStatus(booking.paymentStatus)
      )}</span>
    </section>
    <table>${tableRows}</table>
    <div class="total">${isRefundInvoice ? "Refund" : "Total"}: ${escapeInvoiceValue(
      formatMoney(isRefundInvoice ? refund.amount || booking.amount : booking.amount)
    )}</div>
    <p class="note">${
      isRefundInvoice
        ? "This refund invoice is generated from Santosh Salon Queue refund records. Refunds are processed to the original Cashfree payment method."
        : "This invoice is generated from Santosh Salon Queue booking records. Please keep the payment/order references for support or refund requests."
    }</p>
  </main>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoiceNo}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getCashfreeChargePreview = (amount, peopleCount = 1) => {
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

const getUserPhotoUrl = (user) =>
  user?.photoURL ||
  user?.providerData?.find((provider) => provider?.photoURL)?.photoURL ||
  "";

const normalizeService = (snapshotDoc) => {
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

const normalizeQueueItem = (snapshotDoc, displayToken) => {
  const data = snapshotDoc.data();
  const status = data.status || "waiting";
  const createdAtDate = data.createdAt?.toDate?.();

  return {
    id: snapshotDoc.id,
    token: displayToken || data.token || "-",
    name: data.name || "Customer",
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

const getNextQueueToken = async (bookingDate) => {
  const queueSnapshot = await getDocs(
    firestoreQuery(
      collection(db, "customers"),
      where("bookingDate", "==", bookingDate)
    )
  );

  const activeCount = queueSnapshot.docs.filter((snapshotDoc) =>
    activeBookingStatuses.has(
      String(snapshotDoc.data().status || "").toLowerCase()
    )
  ).length;

  return activeCount + 1;
};

const getBookingDayStats = async (bookingDate) => {
  const bookingSnapshot = await getDocs(
    firestoreQuery(
      collection(db, "customers"),
      where("bookingDate", "==", bookingDate)
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
    availableSlots: timeSlots.filter(
      (slot) => (slotCounts[slot.value] || 0) < STAFF_COUNT
    ),
    slotCounts
  };
};

const getActiveUserBookings = async (userId) => {
  const bookingSnapshot = await getDocs(
    firestoreQuery(collection(db, "customers"), where("userId", "==", userId))
  );

  return bookingSnapshot.docs
    .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
    .filter((booking) =>
      activeBookingStatuses.has(String(booking.status || "").toLowerCase())
    );
};

const formatStatus = (status) =>
  String(status || "waiting")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatBookingStatus = (status) =>
  ({
    waiting: "Confirmed",
    waitlist: "Waiting",
    in_chair: "In Chair",
    completed: "Completed",
    skipped: "Skipped",
    cancelled: "Cancelled"
  })[String(status || "waiting").toLowerCase()] || formatStatus(status);

const normalizeUserBooking = (snapshotDoc) => {
  const data = snapshotDoc.data();
  const createdAtDate = data.createdAt?.toDate?.();

  return {
    id: snapshotDoc.id,
    token: data.token || "-",
    peopleAhead:
      data.peopleAhead !== undefined
        ? Number(data.peopleAhead || 0)
        : Math.max(0, Number(data.token || 1) - 1),
    service: data.service || "Salon Service",
    mobile: data.mobile || data.phone || "",
    status: String(data.status || "waiting").toLowerCase(),
    bookingLabel:
      data.bookingLabel && data.bookingDisplayDate
        ? `${data.bookingLabel}, ${data.bookingDisplayDate}`
        : data.bookingDate || "-",
    timeSlot: data.timeSlot || "",
    timeSlotLabel: data.timeSlotLabel || "",
    arrivalNote:
      data.arrivalNote ||
      "Please reach the salon 40 minutes before your turn for a quicker haircut. Cancel your booking if you cannot visit.",
    amount: data.payableAmount || data.amount || 0,
    paymentProvider: data.paymentProvider || "-",
    paymentStatus: String(data.paymentStatus || "-").toLowerCase(),
    paymentId:
      data.cashfreePaymentId ||
      data.razorpayPaymentId ||
      data.cashfreeCfOrderId ||
      "-",
    transactionId:
      data.transactionId ||
      data.cashfreeTransactionId ||
      data.cashfreeOrderId ||
      data.razorpayOrderId ||
      "-",
    orderId: data.cashfreeOrderId || data.razorpayOrderId || "-",
    refundStatus: String(data.refundStatus || "").toLowerCase(),
    refundRequestId: data.refundRequestId || "",
    customerType: data.customerType || "self",
    bookingGroupId: data.bookingGroupId || "",
    createdAt: createdAtDate,
    createdAtTime: createdAtDate
      ? createdAtDate.toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "Live"
  };
};

function UserAvatar({ user, size = "h-10 w-10" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const photoUrl = getUserPhotoUrl(user);
  const initial =
    user?.displayName?.trim()?.charAt(0) ||
    user?.email?.trim()?.charAt(0) ||
    "U";

  useEffect(() => {
    setImageFailed(false);
    setImageReady(false);
  }, [photoUrl]);

  if (photoUrl && !imageFailed) {
    return (
      <span className={`${size} relative block overflow-hidden rounded-full`}>
        <span
          className={`absolute inset-0 grid place-items-center rounded-full bg-[#0f766e] text-base font-black uppercase text-white ${
            imageReady ? "opacity-0" : "opacity-100"
          }`}
        >
          {initial}
        </span>
        <img
          alt="Profile"
          className={`${size} rounded-full object-cover transition-opacity ${
            imageReady ? "opacity-100" : "opacity-0"
          }`}
          onError={() => setImageFailed(true)}
          onLoad={() => setImageReady(true)}
          referrerPolicy="no-referrer"
          src={photoUrl}
        />
      </span>
    );
  }

  return (
    <span
      className={`${size} grid place-items-center rounded-full bg-[#0f766e] text-base font-black uppercase text-white`}
    >
      {initial.toUpperCase()}
    </span>
  );
}

function ButtonSpinner({ dark = false }) {
  return (
    <span
      className={`h-4 w-4 animate-spin rounded-full border-2 ${
        dark
          ? "border-[#173734]/25 border-t-[#173734]"
          : "border-white/35 border-t-white"
      }`}
    />
  );
}

function PaginationControls({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button
        className="min-h-11 rounded-2xl bg-[#f6faf8] px-4 font-black text-[#173734] disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        Prev
      </button>
      {Array.from({ length: totalPages }).map((_, index) => {
        const value = index + 1;
        return (
          <button
            className={`grid h-11 w-11 place-items-center rounded-2xl font-black ${
              page === value
                ? "bg-[#0f766e] text-white"
                : "bg-[#f6faf8] text-[#173734]"
            }`}
            key={value}
            onClick={() => onPageChange(value)}
            type="button"
          >
            {value}
          </button>
        );
      })}
      <button
        className="min-h-11 rounded-2xl bg-[#f6faf8] px-4 font-black text-[#173734] disabled:opacity-50"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  loading = false,
  tone = "danger",
  onCancel,
  onConfirm
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102b28]/70 px-4 py-6 backdrop-blur-sm">
      <div className="queue-shadow w-full max-w-md rounded-[2rem] bg-white p-5 sm:p-6">
        <h2 className="text-2xl font-black text-[#173734]">{title}</h2>
        <p className="mt-3 leading-7 text-[#637371]">{message}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            className="min-h-12 rounded-2xl bg-[#f6faf8] px-5 font-black text-[#173734]"
            disabled={loading}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-black text-white disabled:opacity-60 ${
              tone === "danger" ? "bg-[#b91c1c]" : "bg-[#0f766e]"
            }`}
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? <ButtonSpinner /> : null}
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <main className="min-h-screen bg-[#f7faf8] text-[#182022]">
      <header className="border-b border-white/70 bg-[#f7faf8]/88">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="skeleton h-11 w-11 rounded-2xl" />
            <div>
              <div className="skeleton h-3 w-20 rounded-full" />
              <div className="skeleton mt-2 h-5 w-32 rounded-full" />
            </div>
          </div>
          <div className="skeleton h-11 w-11 rounded-2xl lg:w-28" />
        </div>
      </header>
      <section className="mx-auto grid min-h-[72vh] max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_430px] lg:px-8">
        <div>
          <div className="skeleton h-10 w-52 rounded-full" />
          <div className="skeleton mt-5 h-16 max-w-2xl rounded-3xl" />
          <div className="skeleton mt-4 h-16 max-w-xl rounded-3xl" />
          <div className="mt-7 flex gap-3">
            <div className="skeleton h-[52px] w-40 rounded-2xl" />
            <div className="skeleton h-[52px] w-40 rounded-2xl" />
          </div>
        </div>
        <div className="skeleton h-96 rounded-[2rem]" />
      </section>
    </main>
  );
}

function TopProgress({ routeProgress, routeProgressActive, scrollProgress }) {
  const progress = routeProgressActive ? routeProgress : scrollProgress;

  return (
    <div className="h-1.5 w-full bg-[#dbe8e3]">
      <div
        className="h-full rounded-r-full bg-[#0f766e] transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function ScrollPercentBadge({ visible, value }) {
  return (
    <div
      className={`pointer-events-none fixed bottom-5 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#173734] text-sm font-black text-white shadow-2xl shadow-[#173734]/30 ring-4 ring-white/80 transition-all duration-300 sm:bottom-6 sm:right-6 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      {Math.round(value)}%
    </div>
  );
}

function Header({
  page,
  user,
  onLogin,
  onNavigate,
  authLoading,
  loginLoading,
  routeProgress,
  routeProgressActive,
  scrollProgress
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navPages = user ? [...pages, "profile"] : pages;

  useEffect(() => {
    if (!menuOpen) {
      document.body.classList.remove("drawer-open");
      document.body.style.removeProperty("--scrollbar-width");
      return undefined;
    }

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
    document.body.classList.add("drawer-open");

    return () => {
      document.body.classList.remove("drawer-open");
      document.body.style.removeProperty("--scrollbar-width");
    };
  }, [menuOpen]);

  const go = (nextPage) => {
    setMenuOpen(false);
    onNavigate(nextPage);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-[#f7faf8]/88 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button
          className="flex items-center gap-3 text-left"
          onClick={() => go("home")}
          type="button"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0f766e] text-white shadow-lg shadow-[#0f766e]/20">
            <Scissors size={22} />
          </span>
          <span>
            <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">
              Santosh
            </span>
            <span className="block text-lg font-black leading-none">
              Salon Queue
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 rounded-2xl bg-white p-1 shadow-sm lg:flex">
          {navPages.map((item) => (
            <button
              className={`h-11 rounded-xl px-4 text-sm font-black transition ${
                page === item
                  ? "bg-[#0f766e] text-white"
                  : "text-[#52625f] hover:bg-[#effaf7] hover:text-[#0f766e]"
              }`}
              key={item}
              onClick={() => go(item)}
              type="button"
            >
              {titleCase(item)}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {authLoading ? (
            <div className="skeleton h-12 w-12 rounded-2xl" />
          ) : user ? (
            <button
              aria-label="Open profile"
              className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-1 font-black text-[#173734] shadow-sm transition hover:bg-[#effaf7]"
              onClick={() => go("profile")}
              type="button"
            >
              <UserAvatar size="h-9 w-9" user={user} />
            </button>
          ) : (
            <button
              className="flex h-11 items-center gap-2 rounded-2xl bg-[#173734] px-4 font-black text-white disabled:opacity-70"
              disabled={loginLoading}
              onClick={onLogin}
              type="button"
            >
              {loginLoading ? <ButtonSpinner /> : <LogIn size={18} />}
              {loginLoading ? "Logging in..." : "Login"}
            </button>
          )}
        </div>

        <button
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm lg:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          type="button"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          aria-label="Close menu"
          className={`absolute inset-0 bg-[#102b28]/38 backdrop-blur-md transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
          type="button"
        />
        <aside
          className={`absolute left-0 top-0 flex h-dvh w-[86vw] max-w-sm flex-col bg-white p-4 shadow-2xl transition-transform duration-300 ease-out ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0f766e] text-white">
                <Scissors size={22} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">
                  Santosh
                </p>
                <p className="font-black">Salon Queue</p>
              </div>
            </div>
            <button
              className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f6faf8]"
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid gap-2">
            {navPages.map((item) => (
              <button
                className={`h-12 rounded-2xl px-4 text-left font-black ${
                  page === item
                    ? "bg-[#0f766e] text-white"
                    : "bg-[#f6faf8] text-[#334340]"
                }`}
                key={item}
                onClick={() => go(item)}
                type="button"
              >
                {titleCase(item)}
              </button>
            ))}
            <button
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#173734] font-black text-white"
              disabled={loginLoading}
              onClick={user ? () => go("profile") : onLogin}
              type="button"
            >
              {user ? (
                <UserAvatar size="h-8 w-8" user={user} />
              ) : loginLoading ? (
                <ButtonSpinner />
              ) : (
                <LogIn size={18} />
              )}
              {user ? "Profile" : loginLoading ? "Logging in..." : "Login"}
            </button>
          </div>
        </aside>
      </div>
      <TopProgress
        routeProgress={routeProgress}
        routeProgressActive={routeProgressActive}
        scrollProgress={scrollProgress}
      />
    </header>
  );
}

const getQueueEstimateMinutes = (waitingCount) => {
  if (!waitingCount) return 0;
  return Math.ceil(waitingCount / STAFF_COUNT) * 25;
};

function QueueSummaryCard({ loading, onNavigate, stats }) {
  const nextToken = loading ? "--" : stats.displayToken;
  const waitingCount = loading ? "--" : stats.waitingCount;
  const estimateMinutes = loading
    ? "--"
    : `${getQueueEstimateMinutes(stats.waitingCount)}m`;

  return (
    <section className="queue-shadow rounded-[2rem] bg-white p-4 text-[#182022] sm:p-5">
      <div className="rounded-[1.5rem] bg-[#effaf7] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0f766e]">
              {loading ? "Live Queue" : stats.tokenLabel}
            </p>
            <p className="mt-1 text-6xl font-black tracking-tight text-[#12312e]">
              {nextToken}
            </p>
            <p className="mt-1 text-xs font-black text-[#637371]">
              {loading ? "Syncing..." : stats.tokenHint}
            </p>
          </div>
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-[#0f766e] text-white">
            <BellRing size={28} />
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4">
            <p className="flex items-center gap-2 text-sm text-[#637371]">
              <UsersRound size={16} /> Waiting
            </p>
            <p className="mt-2 text-3xl font-black">{waitingCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="flex items-center gap-2 text-sm text-[#637371]">
              <Clock3 size={16} /> Estimate
            </p>
            <p className="mt-2 text-3xl font-black">{estimateMinutes}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[#d9e5df] bg-white p-4">
        <p className="text-sm font-bold text-[#637371]">
          Choose a service first. Details are collected at checkout.
        </p>
        <button
          className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-5 py-4 font-black text-white shadow-lg shadow-[#0f766e]/20 transition hover:bg-[#115e59]"
          onClick={() => onNavigate("booking")}
          type="button"
        >
          View Services <ArrowRight size={19} />
        </button>
      </div>
    </section>
  );
}

function BookingClosedNotice({ bookingGate }) {
  if (bookingGate.loading || bookingGate.open) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="queue-shadow flex flex-col gap-3 rounded-[2rem] border border-[#fecaca] bg-[#fff1f2] p-5 text-[#991b1b] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em]">
            Booking Closed
          </p>
          <p className="mt-1 text-lg font-black">{bookingGate.message}</p>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-black">
          Try after sometime
        </span>
      </div>
    </section>
  );
}

function CheckoutModal({
  bookingGate,
  service,
  user,
  onBookingSuccess,
  onClose
}) {
  const [createCustomerPaymentOrder] = useCreateCustomerPaymentOrderMutation();
  const [verifyCustomerPayment] = useVerifyCustomerPaymentMutation();
  const [form, setForm] = useState({
    name: user?.displayName || user?.email?.split("@")[0] || "",
    mobile: "",
    bookingDay: "today",
    timeSlot: "",
    includeGuest: false,
    guestName: "",
    guestMobile: "",
    paymentMethod: "online"
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slotState, setSlotState] = useState({
    loading: true,
    availableSlots: [],
    confirmedCount: 0,
    waitlistCount: 0
  });

  useEffect(() => {
    setForm({
      name: user?.displayName || user?.email?.split("@")[0] || "",
      mobile: "",
      bookingDay: "today",
      timeSlot: "",
      includeGuest: false,
      guestName: "",
      guestMobile: "",
      paymentMethod: "online"
    });
    setStatus(null);
  }, [service, user]);

  useEffect(() => {
    if (!service) return undefined;

    let cancelled = false;
    const bookingOption = getBookingOption(form.bookingDay);
    setSlotState((current) => ({ ...current, loading: true }));

    getBookingDayStats(bookingOption.date)
      .then((stats) => {
        if (cancelled) return;
        const requiredSeats = form.includeGuest ? 2 : 1;
        const visibleSlots = getVisibleTimeSlots(form.bookingDay, timeSlots).filter(
          (slot) =>
            STAFF_COUNT - Number(stats.slotCounts[slot.value] || 0) >=
            requiredSeats
        );
        setSlotState({
          loading: false,
          availableSlots: visibleSlots,
          confirmedCount: stats.confirmedCount,
          waitlistCount: stats.waitlistCount
        });
        setForm((current) => {
          const currentSlotAvailable = visibleSlots.some(
            (slot) => slot.value === current.timeSlot
          );

          if (current.timeSlot && currentSlotAvailable) return current;

          return {
            ...current,
            timeSlot: visibleSlots[0]?.value || ""
          };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSlotState({
          loading: false,
          availableSlots: [],
          confirmedCount: 0,
          waitlistCount: 0
        });
      });

    return () => {
      cancelled = true;
    };
  }, [form.bookingDay, form.includeGuest, service]);

  if (!service) return null;

  const guestMobile = form.guestMobile.replace(/\D/g, "");
  const peopleCount = form.includeGuest ? 2 : 1;
  const onlineChargePreview = getCashfreeChargePreview(
    service.amount,
    peopleCount
  );
  const cashChargePreview = {
    serviceAmount: Math.round(Number(service.amount || 0) * peopleCount * 100) / 100,
    cashfreeFeePercent: 0,
    cashfreeFee: 0,
    payableAmount: Math.round(Number(service.amount || 0) * peopleCount * 100) / 100
  };
  const chargePreview =
    form.paymentMethod === "cod" ? cashChargePreview : onlineChargePreview;

  const submitCheckout = async (event) => {
    event.preventDefault();
    setStatus(null);

    const mobile = form.mobile.replace(/\D/g, "");
    if (!form.name.trim() || mobile.length < 10) {
      const message =
        "Please enter a customer name and a valid 10 digit mobile number.";
      setStatus({
        type: "error",
        message
      });
      toast.error(message);
      return;
    }

    if (
      form.includeGuest &&
      (!form.guestName.trim() || guestMobile.length < 10)
    ) {
      const message =
        "Please enter the guest name and a valid 10 digit guest mobile number.";
      setStatus({
        type: "error",
        message
      });
      toast.error(message);
      return;
    }

    const bookingOption = getBookingOption(form.bookingDay);
    const selectedSlot = timeSlots.find((slot) => slot.value === form.timeSlot);

    if (!isCustomerBookingWindowOpen(bookingGate)) {
      const message = getBookingWindowMessage(bookingGate);
      setStatus({
        type: "error",
        message
      });
      toast.error(message);
      return;
    }

    if (!selectedSlot && slotState.confirmedCount < DAILY_CONFIRMED_LIMIT) {
      const message =
        "No future slots are available for today. Please contact the salon.";
      setStatus({
        type: "error",
        message
      });
      toast.error(message);
      return;
    }

    setLoading(true);
    const customers = [
      {
        name: form.name.trim(),
        mobile,
        customerType: "self"
      },
      ...(form.includeGuest
        ? [
            {
              name: form.guestName.trim(),
              mobile: guestMobile,
              customerType: "guest"
            }
          ]
        : [])
    ];

    try {
      const activeBookings = await getActiveUserBookings(user.uid);
      if (activeBookings.length) {
        const message =
          "You already have an active booking. You can book again after your haircut is completed.";
        setStatus({
          type: "error",
          message
        });
        toast.error(message);
        setLoading(false);
        return;
      }

      const prePaymentStats = await getBookingDayStats(bookingOption.date);
      const prePaymentWaitlist =
        prePaymentStats.confirmedCount + customers.length >
        DAILY_CONFIRMED_LIMIT;
      const prePaymentSlotCount = selectedSlot
        ? Number(prePaymentStats.slotCounts[selectedSlot.value] || 0)
        : 0;
      const prePaymentSlotRemaining = STAFF_COUNT - prePaymentSlotCount;
      if (
        selectedSlot &&
        !prePaymentWaitlist &&
        prePaymentSlotRemaining < customers.length
      ) {
        const message =
          prePaymentSlotRemaining > 0
            ? `This time slot has only ${prePaymentSlotRemaining} spot left. Please choose another slot.`
            : "This time slot is full. Please choose another slot.";
        setStatus({
          type: "error",
          message
        });
        toast.error(message);
        setLoading(false);
        return;
      }
      if (
        prePaymentWaitlist &&
        prePaymentStats.waitlistCount + customers.length > WAITLIST_LIMIT
      ) {
        const message =
          "The waiting list already has 10 customers. Booking will reopen when the waiting list drops to 9.";
        setStatus({
          type: "error",
          message
        });
        toast.error(message);
        setLoading(false);
        return;
      }

      let order = null;
      let paidOrder = {};
      let paidPayment = {};
      let charge = chargePreview;

      if (form.paymentMethod === "online") {
        await loadCashfreeCheckout();

        order = await createCustomerPaymentOrder({
          serviceTitle:
            customers.length > 1
              ? `${service.title} x ${customers.length}`
              : service.title,
          amount: onlineChargePreview.serviceAmount,
          customerName: form.name.trim(),
          customerMobile: mobile,
          customerEmail: user.email || "",
          customerUserId: user.uid,
          bookingDay: bookingOption.day,
          bookingDate: bookingOption.date
        }).unwrap();

        if (!order.payment_session_id || !order.order_id) {
          throw new Error("Cashfree order response is missing checkout details.");
        }

        setStatus({
          type: "info",
          message: `Cashfree checkout opened. Payable amount ${formatMoney(
            order.charge?.payableAmount
          )}.`
        });

        const cashfree = window.Cashfree({
          mode: order.checkoutMode || "sandbox"
        });

        const result = await cashfree.checkout({
          paymentSessionId: order.payment_session_id,
          redirectTarget: "_modal"
        });

        if (result?.error) {
          throw new Error(
            result.error?.message ||
              result.error?.paymentMessage ||
              "Cashfree payment failed"
          );
        }

        const verification = await verifyCustomerPayment(order.order_id).unwrap();
        if (!verification.verified) {
          throw new Error(verification.error || "Payment verification failed");
        }

        paidOrder = verification.order || {};
        paidPayment = verification.payment || {};
        charge = order.charge || onlineChargePreview;
      }

      const firstToken = await getNextQueueToken(bookingOption.date);
      const dayStats = await getBookingDayStats(bookingOption.date);
      const slotCount = selectedSlot
        ? Number(dayStats.slotCounts[selectedSlot.value] || 0)
        : 0;
      const slotOverCapacity =
        selectedSlot && slotCount + customers.length > STAFF_COUNT;
      const isWaitlist =
        dayStats.confirmedCount + customers.length > DAILY_CONFIRMED_LIMIT ||
        slotOverCapacity;
      if (isWaitlist && dayStats.waitlistCount + customers.length > WAITLIST_LIMIT) {
        const message =
          "The waiting list already has 10 customers. Booking will reopen when the waiting list drops to 9.";
        setStatus({
          type: "error",
          message
        });
        toast.error(message);
        setLoading(false);
        return;
      }
      const bookingGroupId = `grp_${Date.now()}_${user.uid.slice(0, 8)}`;
      const bookingRefs = [];

      for (const [index, customer] of customers.entries()) {
        const token = firstToken + index;
        const bookingRef = await addDoc(collection(db, "customers"), {
          name: customer.name,
          mobile: customer.mobile,
          service: service.title,
          amount: service.amount,
          serviceAmount: service.amount,
          payableAmount: service.amount,
          groupServiceAmount: charge.serviceAmount,
          groupPayableAmount: charge.payableAmount,
          cashfreeFeePercent: charge.cashfreeFeePercent ?? 1.6,
          cashfreeFee: charge.cashfreeFee,
          token,
          status: isWaitlist ? "waitlist" : "waiting",
          paymentStatus:
            form.paymentMethod === "cod" ? "cod_pending" : "paid",
          paymentProvider:
            form.paymentMethod === "cod" ? "cash_on_delivery" : "cashfree",
          bookingDay: bookingOption.day,
          bookingDate: bookingOption.date,
          bookingLabel: bookingOption.label,
          bookingDisplayDate: bookingOption.displayDate,
          timeSlot: isWaitlist ? "" : selectedSlot?.value || "",
          timeSlotLabel: isWaitlist
            ? "Waiting list"
            : selectedSlot?.label || "Waiting list",
          cashfreeOrderId: order?.order_id || "",
          cashfreeCfOrderId: order?.cf_order_id || paidOrder.cf_order_id || null,
          cashfreePaymentId: paidPayment.cf_payment_id || "",
          cashfreeTransactionId:
            paidPayment.bank_reference ||
            paidPayment.auth_id ||
            paidPayment.payment_message ||
            "",
          cashfreePaymentGroup: paidPayment.payment_group || "",
          cashfreePaymentStatus:
            form.paymentMethod === "cod"
              ? "PAY_ON_ARRIVAL"
              : paidPayment.payment_status ||
                paidOrder.order_status ||
                "PAID",
          peopleAhead: Math.max(0, token - 1),
          userId: user.uid,
          customerType: customer.customerType,
          bookingGroupId,
          bookingGroupSize: customers.length,
          bookingGroupIndex: index + 1,
          arrivalNote:
            "Please reach the salon 40 minutes before your turn for a quicker haircut. Cancel your booking if you cannot visit.",
          source: "service-payment",
          createdAt: serverTimestamp()
        });
        bookingRefs.push(bookingRef);
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: form.name.trim(),
          email: user.email || "",
          mobile,
          phone: mobile,
          photoURL: getUserPhotoUrl(user),
          latestService: service.title,
          latestBookingDate: bookingOption.date,
          latestTimeSlot: selectedSlot?.value || "",
          latestBookingGroupSize: customers.length,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setStatus({
        type: "success",
        message: `${
          form.paymentMethod === "cod"
            ? "COD booking confirmed"
            : "Cashfree payment verified"
        }. Token ${firstToken}${
          customers.length > 1 ? `-${firstToken + customers.length - 1}` : ""
        } ${
          isWaitlist ? "added to the waiting list" : "confirmed"
        } for ${bookingOption.label}, ${bookingOption.displayDate}.`
      });
      toast.success(
        `Token ${firstToken}${
          customers.length > 1 ? `-${firstToken + customers.length - 1}` : ""
        } ${isWaitlist ? "added to the waiting list" : "confirmed"} for ${
          bookingOption.label
        }.`
      );
      setLoading(false);
      onBookingSuccess?.(bookingRefs[0]?.id);
    } catch (error) {
      const message = getRequestErrorMessage(
        error,
        "Cashfree payment failed. Please try again."
      );
      setStatus({
        type: "error",
        message
      });
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102b28]/70 px-4 py-6 backdrop-blur-sm">
      <section className="queue-shadow max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
              Checkout Details
            </p>
            <h2 className="mt-1 text-3xl font-black">{service.title}</h2>
            <p className="mt-2 text-[#637371]">
              {service.time} • {service.price}
            </p>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f6faf8]"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submitCheckout}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Name</span>
            <input
              className="h-12 w-full rounded-2xl border border-[#d9e5df] bg-white px-4 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#99f6e4]/40"
              onChange={(event) =>
                setForm((value) => ({ ...value, name: event.target.value }))
              }
              value={form.name}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Mobile Number</span>
            <div className="relative">
              <Phone
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71908a]"
                size={18}
              />
              <input
                className="h-12 w-full rounded-2xl border border-[#d9e5df] bg-white pl-11 pr-4 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#99f6e4]/40"
                onChange={(event) =>
                  setForm((value) => ({ ...value, mobile: event.target.value }))
                }
                placeholder="98765 43210"
                value={form.mobile}
              />
            </div>
          </label>
          <div className="rounded-2xl border border-[#d9e5df] bg-[#f6faf8] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#173734]">
                  Book for one more person
                </p>
                <p className="mt-1 text-xs font-bold text-[#637371]">
                  One checkout can create up to 2 tokens: you and one guest.
                  Guest login or registration is not required.
                </p>
              </div>
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                  form.includeGuest
                    ? "bg-[#fee2e2] text-[#b91c1c]"
                    : "bg-[#0f766e] text-white"
                }`}
                onClick={() =>
                  setForm((value) => ({
                    ...value,
                    includeGuest: !value.includeGuest,
                    guestName: value.includeGuest ? "" : value.guestName,
                    guestMobile: value.includeGuest ? "" : value.guestMobile
                  }))
                }
                type="button"
              >
                {form.includeGuest ? "Remove" : "Add Guest"}
              </button>
            </div>

            {form.includeGuest ? (
              <div className="mt-4 grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    Guest Name
                  </span>
                  <input
                    className="h-12 w-full rounded-2xl border border-[#d9e5df] bg-white px-4 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#99f6e4]/40"
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        guestName: event.target.value
                      }))
                    }
                    placeholder="Guest customer name"
                    value={form.guestName}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    Guest Mobile Number
                  </span>
                  <div className="relative">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71908a]"
                      size={18}
                    />
                    <input
                      className="h-12 w-full rounded-2xl border border-[#d9e5df] bg-white pl-11 pr-4 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#99f6e4]/40"
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          guestMobile: event.target.value
                        }))
                      }
                      placeholder="98765 43210"
                      value={form.guestMobile}
                    />
                  </div>
                </label>
              </div>
            ) : null}
          </div>
          <div>
            <span className="mb-2 block text-sm font-bold">Booking Day</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {["today"].map((day) => {
                const option = getBookingOption(day);
                const active = form.bookingDay === day;

                return (
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[#0f766e] bg-[#ecfdf5] text-[#102b28] ring-4 ring-[#99f6e4]/35"
                        : "border-[#d9e5df] bg-white text-[#637371] hover:border-[#0f766e]"
                    }`}
                    key={day}
                    onClick={() =>
                      setForm((value) => ({ ...value, bookingDay: day }))
                    }
                    type="button"
                  >
                    <span className="block font-black">{option.label}</span>
                    <span className="mt-1 block text-sm font-bold">
                      {option.displayDate}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span className="mb-2 block text-sm font-bold">Time Slot</span>
            <div className="services-slider -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3">
              {slotState.loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    className="h-24 min-w-[72%] animate-pulse snap-start rounded-2xl bg-[#f6faf8] sm:min-w-[42%] lg:min-w-[34%]"
                    key={index}
                  />
                ))
              ) : slotState.availableSlots.length ? (
                slotState.availableSlots.map((slot) => {
                  const active = form.timeSlot === slot.value;

                  return (
                    <button
                      className={`min-h-24 min-w-[72%] snap-start rounded-2xl border px-4 py-3 text-left transition sm:min-w-[42%] lg:min-w-[34%] ${
                        active
                          ? "border-[#0f766e] bg-[#ecfdf5] text-[#102b28] ring-4 ring-[#99f6e4]/35"
                          : "border-[#d9e5df] bg-white text-[#637371] hover:border-[#0f766e]"
                      }`}
                      key={slot.value}
                      onClick={() =>
                        setForm((value) => ({ ...value, timeSlot: slot.value }))
                      }
                      type="button"
                    >
                      <span className="block font-black">{slot.label}</span>
                      <span className="mt-1 block text-xs font-bold">
                        {STAFF_COUNT} staff capacity
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="min-w-full rounded-2xl border border-[#fee2e2] bg-[#fff7ed] px-4 py-3 text-sm font-black text-[#c2410c]">
                  No future slots are available for today. Please contact the
                  salon.
                </div>
              )}
            </div>
            <p className="mt-2 text-xs font-bold text-[#637371]">
              Lunch/rest break is 1 PM to 2 PM, so that slot is hidden.{" "}
              {getBookingWindowMessage(bookingGate)}
            </p>
          </div>
          <div>
            <span className="mb-2 block text-sm font-bold">Payment Method</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["online", "Online Payment", "Cashfree secure checkout"],
                ["cod", "Cash on Delivery", "Pay cash at the salon"]
              ].map(([method, label, helper]) => {
                const active = form.paymentMethod === method;

                return (
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[#0f766e] bg-[#ecfdf5] text-[#102b28] ring-4 ring-[#99f6e4]/35"
                        : "border-[#d9e5df] bg-white text-[#637371] hover:border-[#0f766e]"
                    }`}
                    key={method}
                    onClick={() =>
                      setForm((value) => ({
                        ...value,
                        paymentMethod: method
                      }))
                    }
                    type="button"
                  >
                    <span className="block font-black">{label}</span>
                    <span className="mt-1 block text-sm font-bold">
                      {helper}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl bg-[#f6faf8] p-4">
            <p className="text-sm font-bold text-[#637371]">Selected Service</p>
            <div className="mt-2 flex items-center justify-between gap-3 border-b border-[#d9e5df] pb-3">
              <p className="font-black">
                {service.title}
                {peopleCount > 1 ? ` x ${peopleCount}` : ""}
              </p>
              <p className="font-black text-[#0f766e]">
                {formatMoney(chargePreview.serviceAmount)}
              </p>
            </div>
            <div className="mt-3 grid gap-2 text-sm font-bold text-[#173734]">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                <span>{form.name.trim() || "You"}</span>
                <span>Self</span>
              </div>
              {form.includeGuest ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                  <span>{form.guestName.trim() || "Guest"}</span>
                  <span>Guest</span>
                </div>
              ) : null}
            </div>
            <div className="mt-3 space-y-2 text-sm font-bold text-[#637371]">
              {form.paymentMethod === "online" ? (
                <div className="flex items-center justify-between gap-3">
                  <span>Cashfree charge 1.60%</span>
                  <span>{formatMoney(chargePreview.cashfreeFee)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span>Payment at salon</span>
                  <span>No online charge</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-[#d9e5df] pt-2 text-base text-[#102b28]">
                <span>Total payable</span>
                <span>{formatMoney(chargePreview.payableAmount)}</span>
              </div>
            </div>
          </div>
          <button
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-5 py-4 font-black text-white shadow-lg shadow-[#0f766e]/20 transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <>
                <ButtonSpinner />
                {form.paymentMethod === "cod"
                  ? "Creating token..."
                  : "Opening Cashfree..."}
              </>
            ) : (
              <>
                {form.paymentMethod === "cod"
                  ? "Confirm COD Booking"
                  : "Continue to Payment"}{" "}
                <ArrowRight size={19} />
              </>
            )}
          </button>
        </form>

        {status ? (
          <p
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${
              status.type === "success"
                ? "bg-[#dcfce7] text-[#166534]"
                : status.type === "info"
                  ? "bg-[#e0f2fe] text-[#075985]"
                : "bg-[#fee2e2] text-[#b91c1c]"
            }`}
          >
            {status.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function HomePage({
  user,
  onLogin,
  onNavigate,
  onServiceSelect,
  loginLoading,
  bookingGate,
  queueItems,
  queueStats,
  queueLoading,
  services
}) {
  return (
    <>
      <section className="hero-image relative min-h-[88vh] overflow-hidden text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(250,190,106,0.22),transparent_28%)]" />
        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_430px] lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#ecfeff]/14 px-4 py-2 text-sm text-[#ccfbf1] ring-1 ring-white/20">
              <Sparkles size={16} />
              Open daily, 7 AM - 11 PM
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] sm:text-6xl lg:text-7xl">
              Choose a service, then finish details at checkout.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/82 sm:text-lg">
              Choose a service first. Your Google name is prefilled at
              checkout, and you can edit the name and mobile number before
              payment.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#f9c66d] px-6 py-4 font-black text-[#102b28] shadow-lg"
                onClick={() => onNavigate("booking")}
                type="button"
              >
                Choose Service <CalendarCheck2 size={19} />
              </button>
              <button
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/12 px-6 py-4 font-black backdrop-blur"
                onClick={() => onNavigate("about")}
                type="button"
              >
                Explore Salon <ArrowRight size={19} />
              </button>
            </div>
          </div>
          <QueueSummaryCard
            loading={queueLoading}
            onNavigate={onNavigate}
            stats={queueStats}
          />
        </div>
      </section>

      <BookingClosedNotice bookingGate={bookingGate} />

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="rounded-3xl bg-white p-4 queue-shadow sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                Live status
              </p>
              <h2 className="mt-1 text-2xl font-black">Queue moving now</h2>
            </div>
            <span className="rounded-full bg-[#dcfce7] px-4 py-2 text-sm font-bold text-[#166534]">
              Open
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {queueLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="grid grid-cols-[54px_1fr_auto] items-center gap-3 rounded-2xl border border-[#e6eee9] p-3"
                  key={index}
                >
                  <span className="h-12 w-12 animate-pulse rounded-2xl bg-[#eef4f0]" />
                  <div className="min-w-0 space-y-2">
                    <span className="block h-4 w-32 animate-pulse rounded-full bg-[#eef4f0]" />
                    <span className="block h-3 w-20 animate-pulse rounded-full bg-[#eef4f0]" />
                  </div>
                  <span className="h-4 w-12 animate-pulse rounded-full bg-[#eef4f0]" />
                </div>
              ))
            ) : queueItems.length ? (
              queueItems.map((item) => (
                <div
                  className="grid grid-cols-[54px_1fr_auto] items-center gap-3 rounded-2xl border border-[#e6eee9] p-3"
                  key={item.id}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f1f5f2] text-lg font-black">
                    {item.token}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-black">{item.name}</p>
                    <p className="text-sm capitalize text-[#637371]">
                      {item.status}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#0f766e]">{item.eta}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cfe0d8] bg-[#f6faf8] p-5 text-sm font-bold text-[#637371]">
                The queue is empty right now. New customer bookings will appear
                here live.
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-3xl bg-[#173734] p-5 text-white queue-shadow">
          <ShieldCheck className="text-[#a7f3d0]" size={28} />
          <h3 className="mt-4 text-2xl font-black">Simple customer flow</h3>
          <p className="mt-2 leading-7 text-white/72">
            Login, choose service, take token, and watch live queue status while
            you travel to the salon.
          </p>
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 p-4">
            <CheckCircle2 className="text-[#f9c66d]" />
            <span className="text-sm font-bold">Mobile responsive ready</span>
          </div>
        </aside>
      </section>

      <ServicesSection
        bookingGate={bookingGate}
        loginLoading={loginLoading}
        mobileSlider
        onLogin={onLogin}
        onServiceSelect={onServiceSelect}
        services={services}
        user={user}
      />
      <HaircutFeature />
      <HaircutStylesSection
        bookingGate={bookingGate}
        loginLoading={loginLoading}
        onLogin={onLogin}
        onServiceSelect={onServiceSelect}
        services={services}
        user={user}
      />
    </>
  );
}

function ServicesSection({
  user,
  onLogin,
  onServiceSelect,
  loginLoading,
  bookingGate,
  mobileSlider = false,
  services,
  pagination = null
}) {
  const listClassName = mobileSlider
    ? "services-slider -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
    : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";
  const cardClassName = mobileSlider
    ? "queue-shadow min-w-[82vw] snap-start overflow-hidden rounded-3xl bg-white transition hover:-translate-y-1 sm:min-w-0"
    : "queue-shadow overflow-hidden rounded-3xl bg-white transition hover:-translate-y-1";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
            Services
          </p>
          <h2 className="mt-1 text-3xl font-black sm:text-4xl">
            Popular grooming options
          </h2>
        </div>
        <p className="max-w-lg leading-7 text-[#637371]">
          Choose a service now. Name and mobile number are collected only at
          checkout.
        </p>
      </div>
      <div className={listClassName}>
        {services.map((service) => {
          const bookingClosed = !bookingGate.loading && !bookingGate.open;
          const buttonLabel = bookingGate.loading
            ? "Checking..."
            : bookingClosed
              ? "Booking Closed"
              : user
                ? "Choose & Pay"
                : "Login to Choose";

          return (
            <article
              className={cardClassName}
              key={service.title}
            >
              <div className="relative">
                <img
                  alt={service.title}
                  className="h-44 w-full object-cover"
                  src={service.imageUrl || getServiceImageUrl(service.title)}
                />
                <span className="absolute left-4 top-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/88 text-[#0f766e] shadow-lg backdrop-blur">
                  <Scissors size={21} />
                </span>
              </div>
              <div className="p-5">
              <h3 className="mt-5 text-xl font-black">{service.title}</h3>
              <p className="mt-2 flex items-center gap-2 text-sm text-[#637371]">
                <Clock3 size={16} />
                {service.time}
              </p>
              <p className="mt-4 rounded-2xl bg-[#173734] px-4 py-3 text-sm font-black text-white">
                {service.price}
              </p>
              <button
                className={`mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
                  bookingClosed
                    ? "bg-[#991b1b] hover:bg-[#7f1d1d]"
                    : "bg-[#0f766e] hover:bg-[#115e59]"
                }`}
                disabled={bookingGate.loading || (!user && loginLoading)}
                onClick={() => {
                  if (bookingClosed) {
                    onServiceSelect(service);
                    return;
                  }
                  user ? onServiceSelect(service) : onLogin();
                }}
                type="button"
              >
                {!user && loginLoading ? (
                  <>
                    <ButtonSpinner /> Logging in...
                  </>
                ) : bookingGate.loading ? (
                  <>
                    <ButtonSpinner /> {buttonLabel}
                  </>
                ) : (
                  <>
                    {buttonLabel}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
              </div>
            </article>
          );
        })}
      </div>
      {pagination ? <PaginationControls {...pagination} /> : null}
    </section>
  );
}

function HaircutFeature() {
  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <div className="haircut-image min-h-[360px] rounded-[2rem] queue-shadow" />
      <div className="flex flex-col justify-center rounded-[2rem] bg-white p-6 queue-shadow sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
          Fresh haircut experience
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
          Stylish service with queue clarity.
        </h2>
        <p className="mt-4 leading-8 text-[#637371]">
          Customers do not need to guess in the waiting room. The queue screen
          clearly shows token number, people ahead, and live status.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["7 AM", "Opening"],
            ["11 PM", "Closing"],
            ["Live", "Queue"]
          ].map(([value, label]) => (
            <div className="rounded-2xl bg-[#f6faf8] p-4" key={label}>
              <p className="text-2xl font-black text-[#173734]">{value}</p>
              <p className="mt-1 text-sm text-[#637371]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HaircutStylesSection({
  user,
  onLogin,
  onServiceSelect,
  loginLoading,
  bookingGate,
  services
}) {
  const featuredService = services[0] || defaultServices[0];
  const bookingClosed = !bookingGate.loading && !bookingGate.open;
  const buttonLabel = bookingGate.loading
    ? "Checking..."
    : bookingClosed
      ? "Booking Closed"
      : user
        ? "Choose Haircut"
        : "Login to Choose";

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
      <div className="flex flex-col justify-center rounded-[2rem] bg-[#173734] p-6 text-white queue-shadow sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#a7f3d0]">
          Haircut Styles
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
          Pick a clean look before you arrive.
        </h2>
        <p className="mt-4 leading-8 text-white/76">
          Select classic cuts, fade-inspired styling, beard shape-up, or
          grooming combo options from the service cards and complete details at
          checkout.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {["Classic", "Fade", "Beard"].map((style) => (
            <div className="rounded-2xl bg-white/10 p-4" key={style}>
              <Scissors className="text-[#f9c66d]" size={22} />
              <p className="mt-3 font-black">{style}</p>
            </div>
          ))}
        </div>
        <button
          className={`mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit ${
            bookingClosed
              ? "bg-[#fee2e2] text-[#991b1b]"
              : "bg-[#f9c66d] text-[#102b28]"
          }`}
          disabled={bookingGate.loading || (!user && loginLoading)}
          onClick={() => {
            if (bookingClosed) {
              onServiceSelect(featuredService);
              return;
            }
            user ? onServiceSelect(featuredService) : onLogin();
          }}
          type="button"
        >
          {!user && loginLoading ? (
            <>
              <ButtonSpinner dark /> Logging in...
            </>
          ) : bookingGate.loading ? (
            <>
              <ButtonSpinner dark /> {buttonLabel}
            </>
          ) : (
            <>
              {buttonLabel}
              <ArrowRight size={19} />
            </>
          )}
        </button>
      </div>
      <div className="haircut-styles-image min-h-[360px] rounded-[2rem] queue-shadow" />
    </section>
  );
}

function BookingPage({
  user,
  onLogin,
  onServiceSelect,
  loginLoading,
  bookingGate,
  services
}) {
  const [servicePage, setServicePage] = useState(1);
  const totalServicePages = Math.max(
    1,
    Math.ceil(services.length / SERVICE_PAGE_SIZE)
  );
  const safeServicePage = Math.min(servicePage, totalServicePages);
  const paginatedServices = services.slice(
    (safeServicePage - 1) * SERVICE_PAGE_SIZE,
    safeServicePage * SERVICE_PAGE_SIZE
  );

  useEffect(() => {
    setServicePage(1);
  }, [services.length]);

  return (
    <>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-[#173734] p-6 text-white queue-shadow sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#a7f3d0]">
          Booking
        </p>
        <h1 className="mt-2 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
          Choose a service first, then continue to payment.
        </h1>
        <p className="mt-4 max-w-2xl leading-8 text-white/76">
          Your Google name is prefilled. The checkout modal lets you edit both
          name and mobile number.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [UserRound, "Login"],
            [CalendarCheck2, "Choose Service"],
            [BellRing, "Payment Details"]
          ].map(([Icon, label]) => (
            <div className="rounded-2xl bg-white/10 p-4" key={label}>
              <Icon className="text-[#f9c66d]" size={24} />
              <p className="mt-3 font-black">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
    <BookingClosedNotice bookingGate={bookingGate} />
    <ServicesSection
      bookingGate={bookingGate}
      loginLoading={loginLoading}
      onLogin={onLogin}
      onServiceSelect={onServiceSelect}
      pagination={{
        page: safeServicePage,
        totalPages: totalServicePages,
        onPageChange: setServicePage
      }}
      services={paginatedServices}
      user={user}
    />
    </>
  );
}

function AboutPage() {
  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="rounded-[2rem] bg-white p-6 queue-shadow sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
            About Us
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
            Local salon comfort with modern queue management.
          </h1>
          <p className="mt-5 leading-8 text-[#637371]">
            Santosh Salon focuses on clean grooming, respectful service, and
            less waiting stress. This customer portal helps visitors check queue
            status before they arrive.
          </p>
        </div>
        <div className="haircut-image min-h-[360px] rounded-[2rem] queue-shadow" />
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-8 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          ["Fast Tokens", "First come, first serve flow with clear token number."],
          ["Clean Service", "Haircut, beard, wash, and grooming in one place."],
          ["Long Hours", "Open daily from 7 AM to 11 PM for easy visits."]
        ].map(([title, text]) => (
          <article className="rounded-3xl bg-white p-5 queue-shadow" key={title}>
            <Star className="text-[#f97316]" size={24} />
            <h3 className="mt-4 text-xl font-black">{title}</h3>
            <p className="mt-2 leading-7 text-[#637371]">{text}</p>
          </article>
        ))}
      </section>
    </>
  );
}

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <aside className="rounded-[2rem] bg-[#173734] p-6 text-white queue-shadow sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#a7f3d0]">
          Contact Us
        </p>
        <h1 className="mt-2 text-4xl font-black leading-tight">
          Visit or message the salon.
        </h1>
        <div className="mt-6 space-y-3">
          {[
            [MapPin, "Main Market Road, Near City Chowk"],
            [Phone, "+91 98765 43210"],
            [Mail, "hello@santoshsalon.local"],
            [Clock3, "Open daily, 7 AM - 11 PM"]
          ].map(([Icon, label]) => (
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4" key={label}>
              <Icon className="text-[#f9c66d]" size={20} />
              <span className="font-bold">{label}</span>
            </div>
          ))}
        </div>
      </aside>

      <form
        className="rounded-[2rem] bg-white p-6 queue-shadow sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          setSent(true);
        }}
      >
        <h2 className="text-3xl font-black">Send message</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Name</span>
            <input className="h-12 w-full rounded-2xl border border-[#d9e5df] px-4 outline-none focus:border-[#0f766e]" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Mobile</span>
            <input className="h-12 w-full rounded-2xl border border-[#d9e5df] px-4 outline-none focus:border-[#0f766e]" />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold">Message</span>
          <textarea
            className="min-h-36 w-full resize-y rounded-2xl border border-[#d9e5df] p-4 outline-none focus:border-[#0f766e]"
            placeholder="Write your message"
          />
        </label>
        <button className="mt-4 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-6 py-4 font-black text-white">
          <MessageCircle size={19} />
          Send Message
        </button>
        {sent ? (
          <p className="mt-4 rounded-2xl bg-[#dcfce7] px-4 py-3 text-sm font-bold text-[#166534]">
            Message ready. Connect backend/email service when needed.
          </p>
        ) : null}
      </form>
    </section>
  );
}

const legalContent = {
  "privacy-policy": {
    eyebrow: "Privacy Policy",
    title: "How Santosh Salon handles customer data",
    updated: "30 May 2026",
    sections: [
      [
        "Information we collect",
        "We collect Google profile details after login, customer name, mobile number, selected service, booking date, time slot, token number, payment status, and refund details when submitted."
      ],
      [
        "How we use data",
        "We use this information to create salon queue tokens, show booking status, contact customers about their visit, process payments, manage refunds, and improve salon operations."
      ],
      [
        "Authentication and payments",
        "Google Authentication is used for login. Online payments may be processed through Cashfree. Payment providers process payment details under their own security and compliance systems."
      ],
      [
        "Data sharing",
        "We do not sell customer data. Data is shared only with service providers required to run authentication, database, hosting, payment, refund, and support workflows."
      ],
      [
        "Data security",
        "Booking data is stored in Firebase Firestore. Access should be protected using Firebase rules, admin authentication, and server-side validation before production launch."
      ],
      [
        "Contact",
        "For privacy requests, contact Santosh Salon at hello@santoshsalon.local or +91 98765 43210."
      ]
    ]
  },
  "terms-and-conditions": {
    eyebrow: "Terms & Conditions",
    title: "Rules for using Santosh Salon Queue",
    updated: "30 May 2026",
    sections: [
      [
        "Service usage",
        "Customers can book salon services, choose available time slots, join queue, and view live booking status. Bookings are subject to salon working hours, staff availability, and operational decisions."
      ],
      [
        "Customer responsibility",
        "Customers must provide correct name and mobile number. Please reach the salon around 40 minutes before your turn for smoother service."
      ],
      [
        "Booking limits",
        "One logged-in customer can create a booking for self and one guest. New booking is restricted while an active booking is waiting, in chair, or waitlisted."
      ],
      [
        "Salon operations",
        "The salon may skip, complete, cancel, transfer, or reschedule bookings due to closing time, staff availability, customer absence, or operational reasons."
      ],
      [
        "Payments",
        "Customers may pay online or choose cash on delivery/cash at salon where available. Online payment confirmation depends on the payment provider response."
      ],
      [
        "Changes",
        "Santosh Salon may update these terms when service rules, pricing, payment flow, or legal requirements change."
      ]
    ]
  },
  "cancellation-refund-policy": {
    eyebrow: "Cancellation & Refund Policy",
    title: "Booking cancellation and refund rules",
    updated: "30 May 2026",
    sections: [
      [
        "Customer cancellation",
        "Customers can cancel eligible waiting or waitlisted bookings from My Bookings. Completed haircut bookings are not eligible for refund."
      ],
      [
        "Cash bookings",
        "Cash on delivery/cash at salon bookings do not require online refund. If a cash waitlist booking is cancelled automatically, no payment refund is applicable."
      ],
      [
        "Online paid bookings",
        "If an online paid booking is cancelled before service completion, the customer can submit a refund request with payment ID or order ID. Refunds are sent back to the original payment method."
      ],
      [
        "Refund review",
        "Refund requests go to the admin panel for verification. Approved refunds are generally processed within 3-5 business days, depending on bank/payment provider timelines."
      ],
      [
        "Non-refundable cases",
        "Refund may be rejected if the service is completed, payment cannot be verified, incorrect refund details are submitted, or cancellation violates salon policy."
      ]
    ]
  },
  "payment-policy": {
    eyebrow: "Payment Policy",
    title: "Online and cash payment information",
    updated: "30 May 2026",
    sections: [
      [
        "Accepted payment modes",
        "Customer service bookings may support Cashfree online checkout and cash on delivery/cash at salon."
      ],
      [
        "Charges",
        "Customer online payments may include a Cashfree payment charge shown at checkout. The final payable amount is displayed before payment."
      ],
      [
        "Payment confirmation",
        "Online booking is confirmed only after successful payment verification. Cash bookings are marked as pending payment until paid at the salon."
      ],
      [
        "Failed payments",
        "If a payment fails or remains unverified, the booking may not be confirmed. Customers can try again or contact the salon."
      ],
      [
        "Payment provider role",
        "Cashfree and Razorpay are third-party payment providers. They may collect and process payment information according to their own policies and applicable payment regulations."
      ]
    ]
  }
};

function LegalPage({ page }) {
  const content = legalContent[page] || legalContent["privacy-policy"];

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-white p-6 queue-shadow sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
          {content.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
          {content.title}
        </h1>
        <p className="mt-3 text-sm font-bold text-[#637371]">
          Last updated: {content.updated}
        </p>
        <div className="mt-7 grid gap-4">
          {content.sections.map(([heading, text]) => (
            <article className="rounded-3xl bg-[#f6faf8] p-5" key={heading}>
              <h2 className="text-xl font-black text-[#173734]">{heading}</h2>
              <p className="mt-2 leading-7 text-[#637371]">{text}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 rounded-2xl bg-[#fff7ed] px-4 py-3 text-sm font-bold text-[#9a3412]">
          This page is a business policy template for launch readiness. Review
          with a qualified professional before final production use.
        </p>
      </div>
    </section>
  );
}

function RefundRequestDialog({ booking, user, onClose }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    paymentId: booking?.paymentId || "",
    orderId: booking?.orderId && booking.orderId !== "-" ? booking.orderId : "",
    reason: ""
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      paymentId: booking?.paymentId || "",
      orderId: booking?.orderId && booking.orderId !== "-" ? booking.orderId : ""
    }));
  }, [booking]);

  if (!booking) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitRefund = async (event) => {
    event.preventDefault();

    const hasPaymentRef = form.paymentId.trim() || form.orderId.trim();

    if (!hasPaymentRef) {
      toast.error(
        "Payment ID or Order ID is required for a refund."
      );
      return;
    }

    setSubmitting(true);
    try {
      const refundRef = await addDoc(collection(db, "refundRequests"), {
        userId: user.uid,
        bookingId: booking.id,
        token: booking.token,
        service: booking.service,
        bookingStatus: booking.status,
        customerName: user.displayName || "Customer",
        customerEmail: user.email || "",
        customerMobile: booking.mobile,
        paymentId: form.paymentId.trim(),
        transactionId: booking.transactionId && booking.transactionId !== "-"
          ? booking.transactionId
          : "",
        orderId: form.orderId.trim(),
        amount: Number(booking.amount || 0),
        reason: form.reason.trim(),
        refundMethod: "original_payment_method",
        upiId: "",
        bankDetails: null,
        status: "requested",
        expectedWindow: "3-5 business days",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, "customers", booking.id), {
        refundStatus: "requested",
        refundRequestId: refundRef.id,
        updatedAt: serverTimestamp()
      });

      toast.success("Refund request sent. You will receive an update after admin review.");
      onClose();
    } catch (error) {
      toast.error(error.message || "Refund request could not be sent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102b28]/70 px-4 py-6 backdrop-blur-sm">
      <form
        className="queue-shadow max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-5 sm:p-6"
        onSubmit={submitRefund}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
              Refund Request
            </p>
            <h2 className="mt-1 text-3xl font-black">{booking.service}</h2>
            <p className="mt-2 text-sm font-bold text-[#637371]">
              Token {booking.token} • {formatMoney(booking.amount)}
            </p>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f6faf8]"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["paymentId", "Payment ID"],
            ["orderId", "Order ID"]
          ].map(([field, label]) => (
            <label className="block sm:col-span-2" key={field}>
              <span className="mb-2 block text-sm font-bold">{label}</span>
              <input
                className="h-12 w-full rounded-2xl border border-[#d9e5df] px-4 outline-none focus:border-[#0f766e]"
                onChange={(event) => updateField(field, event.target.value)}
                placeholder={label}
                value={form[field]}
              />
            </label>
          ))}
        </div>

        <p className="mt-4 rounded-2xl bg-[#ecfdf5] px-4 py-3 text-sm font-bold text-[#0f766e]">
          Refund will be processed to the original payment method used in Cashfree.
        </p>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold">Reason</span>
          <textarea
            className="min-h-24 w-full resize-y rounded-2xl border border-[#d9e5df] p-4 outline-none focus:border-[#0f766e]"
            onChange={(event) => updateField("reason", event.target.value)}
            placeholder="Refund reason"
            value={form.reason}
          />
        </label>

        <button
          className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-6 py-4 font-black text-white disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? <ButtonSpinner /> : <MessageCircle size={19} />}
          {submitting ? "Sending..." : "Send Refund Request"}
        </button>
      </form>
    </div>
  );
}

function ProfilePage({
  loginLoading,
  logoutLoading,
  onLogin,
  onLogout,
  user
}) {
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [refundRequests, setRefundRequests] = useState([]);
  const [refundBooking, setRefundBooking] = useState(null);
  const [cancelBookingId, setCancelBookingId] = useState("");
  const [bookingPage, setBookingPage] = useState(1);

  const totalBookingPages = Math.max(
    1,
    Math.ceil(bookings.length / BOOKING_PAGE_SIZE)
  );
  const safeBookingPage = Math.min(bookingPage, totalBookingPages);
  const paginatedBookings = bookings.slice(
    (safeBookingPage - 1) * BOOKING_PAGE_SIZE,
    safeBookingPage * BOOKING_PAGE_SIZE
  );

  useEffect(() => {
    setBookingPage(1);
  }, [bookings.length]);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setBookingsLoading(false);
      return undefined;
    }

    setBookingsLoading(true);
    const bookingsRef = firestoreQuery(
      collection(db, "customers"),
      where("userId", "==", user.uid)
    );

    return onSnapshot(
      bookingsRef,
      (snapshot) => {
        const nextBookings = snapshot.docs
          .map(normalizeUserBooking)
          .sort((first, second) => {
            const firstTime = first.createdAt?.getTime?.() || 0;
            const secondTime = second.createdAt?.getTime?.() || 0;
            return secondTime - firstTime;
          });
        setBookings(nextBookings);
        setBookingsLoading(false);
      },
      () => {
        setBookings([]);
        setBookingsLoading(false);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRefundRequests([]);
      return undefined;
    }

    const refundsRef = firestoreQuery(
      collection(db, "refundRequests"),
      where("userId", "==", user.uid)
    );

    return onSnapshot(
      refundsRef,
      (snapshot) => {
        setRefundRequests(
          snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
            status: String(snapshotDoc.data().status || "").toLowerCase()
          }))
        );
      },
      () => setRefundRequests([])
    );
  }, [user]);

  const cancelBooking = async (booking) => {
    if (!booking || !["waiting", "waitlist"].includes(booking.status)) return;

    setCancelBookingId(booking.id);
    try {
      await updateDoc(doc(db, "customers", booking.id), {
        status: "cancelled",
        cancelledBy: "customer",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (
        booking.paymentProvider === "cashfree" &&
        booking.paymentStatus === "paid"
      ) {
        toast.success("Booking cancelled. Refund request option is now available.");
      } else {
        toast.success("Booking cancelled.");
      }
    } catch (error) {
      toast.error(error.message || "Booking could not be cancelled.");
    } finally {
      setCancelBookingId("");
    }
  };

  if (!user) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-6 text-center queue-shadow sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#effaf7] text-[#0f766e]">
            <UserRound size={26} />
          </span>
          <h1 className="mt-5 text-3xl font-black">Login required</h1>
          <p className="mt-3 leading-7 text-[#637371]">
            Log in to view your profile.
          </p>
          <button
            className="mx-auto mt-5 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#173734] px-6 py-4 font-black text-white disabled:opacity-70"
            disabled={loginLoading}
            onClick={onLogin}
            type="button"
          >
            {loginLoading ? <ButtonSpinner /> : <LogIn size={19} />}
            {loginLoading ? "Logging in..." : "Login"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-white p-6 queue-shadow sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <UserAvatar size="h-20 w-20" user={user} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                Profile
              </p>
              <h1 className="mt-1 text-3xl font-black leading-tight text-[#173734] sm:text-4xl">
                {user.displayName || "Customer Profile"}
              </h1>
              <p className="mt-2 break-words text-sm font-bold text-[#637371]">
                {user.email || "Google account connected"}
              </p>
            </div>
          </div>
          <button
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#173734] px-6 py-4 font-black text-white disabled:opacity-70"
            disabled={logoutLoading}
            onClick={onLogout}
            type="button"
          >
            {logoutLoading ? <ButtonSpinner /> : <LogOut size={19} />}
            {logoutLoading ? "Logging out..." : "Logout"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Name", user.displayName || "Not available"],
            ["Email", user.email || "Not available"],
            ["Login Provider", "Google"],
            ["User ID", user.uid]
          ].map(([label, value]) => (
            <div className="rounded-2xl bg-[#f6faf8] p-4" key={label}>
              <p className="text-sm font-bold text-[#637371]">{label}</p>
              <p className="mt-1 break-words font-black text-[#173734]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] bg-white p-6 queue-shadow sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
          Queue History
        </p>
        <h2 className="mt-2 text-3xl font-black">My bookings</h2>
            <div className="mt-6 grid gap-4">
              {bookingsLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    className="h-28 animate-pulse rounded-2xl bg-[#f6faf8]"
                    key={index}
                  />
                ))
              ) : bookings.length ? (
                paginatedBookings.map((booking) => {
                  const activeBooking = ["waiting", "waitlist", "in_chair"].includes(
                    booking.status
                  );
                  const bookingRefund = refundRequests.find(
                    (refund) => refund.bookingId === booking.id
                  );
                  const refundStatus = String(
                    bookingRefund?.status || booking.refundStatus || ""
                  ).toLowerCase();
                  const refundInProgress =
                    refundStatus && !["failed", "rejected"].includes(refundStatus);
                  const turnLabel =
                    booking.status === "waitlist"
                      ? "Waiting list"
                      : `Haircut turn #${booking.token}`;
                  const helperText =
                    refundStatus === "completed"
                      ? "Refund completed. The amount has been sent back to the original payment method."
                      : refundStatus === "processing"
                        ? "Refund initiated. Final bank/payment confirmation is pending."
                      : refundInProgress
                        ? `Refund ${formatStatus(refundStatus)}. You do not need to submit another request.`
                        : booking.status === "completed"
                      ? "Haircut completed, refund option unavailable."
                      : booking.status === "cancelled" &&
                          booking.paymentProvider === "cashfree" &&
                          booking.paymentStatus === "paid"
                        ? "Online paid booking cancelled. You can send a refund request."
                        : booking.status === "cancelled"
                          ? "Booking cancelled."
                          : ["waiting", "waitlist"].includes(booking.status)
                            ? "You can cancel this booking before service starts."
                            : "Queue status is updating live.";

                  return (
                    <article
                      className="rounded-2xl border border-[#d9e5df] bg-[#fbfdfc] p-4"
                      key={booking.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">
                            {turnLabel}
                          </p>
                          <h3 className="mt-1 truncate text-xl font-black text-[#173734]">
                            {booking.service}
                          </h3>
                          <p className="mt-1 text-sm font-bold text-[#637371]">
                            {booking.bookingLabel} •{" "}
                            {booking.timeSlotLabel || booking.timeSlot || "Waiting list"}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-black text-[#0f766e]">
                          {formatBookingStatus(booking.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {[
                          ["People Ahead", activeBooking ? booking.peopleAhead : "-"],
                          ["Amount", formatMoney(booking.amount)],
                          ["Method", formatStatus(booking.paymentProvider)],
                          ["Payment ID", booking.paymentId || "-"],
                          ["Transaction ID", booking.transactionId || "-"],
                          ["Created", booking.createdAtTime]
                        ].map(([label, value]) => (
                          <div className="rounded-2xl bg-[#f6faf8] px-3 py-2" key={label}>
                            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#637371]">
                              {label}
                            </p>
                            <p className="mt-1 truncate font-black text-[#173734]">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#d9e5df] pt-3">
                        <p className="max-w-xl text-sm font-bold text-[#637371]">
                          {helperText}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-2xl bg-[#eef8f5] px-4 py-3 text-sm font-black text-[#0f766e]"
                            onClick={() => {
                              downloadBookingInvoice(
                                booking,
                                user,
                                refundInProgress ? bookingRefund || booking : null
                              );
                              toast.success(
                                refundInProgress
                                  ? "Refund invoice downloaded."
                                  : "Invoice downloaded."
                              );
                            }}
                            type="button"
                          >
                            <Download size={16} />
                            {refundInProgress ? "Refund Invoice" : "Invoice"}
                          </button>
                          {["waiting", "waitlist"].includes(booking.status) ? (
                            <button
                              className="rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm font-black text-[#b91c1c] disabled:opacity-60"
                              disabled={cancelBookingId === booking.id}
                              onClick={() => cancelBooking(booking)}
                              type="button"
                            >
                              {cancelBookingId === booking.id ? (
                                <span className="inline-flex items-center gap-2">
                                  <ButtonSpinner dark /> Cancelling...
                                </span>
                              ) : (
                                "Cancel"
                              )}
                            </button>
                          ) : null}
                          {booking.status === "cancelled" &&
                          booking.paymentProvider === "cashfree" &&
                          booking.paymentStatus === "paid" &&
                          !refundInProgress ? (
                            <button
                              className="rounded-2xl bg-[#fff7ed] px-4 py-3 text-sm font-black text-[#c2410c]"
                              onClick={() => setRefundBooking(booking)}
                              type="button"
                            >
                              Refund
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {activeBooking ? (
                        <p className="mt-3 rounded-2xl bg-[#ecfdf5] px-3 py-2 text-xs font-black text-[#0f766e]">
                          {booking.arrivalNote}
                        </p>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[#cfe0d8] bg-[#f6faf8] p-6 text-center">
                  <CalendarCheck2 className="mx-auto text-[#0f766e]" size={30} />
                  <p className="mt-3 font-black">No bookings yet.</p>
                  <p className="mt-1 text-sm font-bold text-[#637371]">
                    Your bookings will appear here after you choose a service.
                  </p>
                </div>
              )}
              {!bookingsLoading && bookings.length ? (
                <PaginationControls
                  onPageChange={setBookingPage}
                  page={safeBookingPage}
                  totalPages={totalBookingPages}
                />
              ) : null}
            </div>
      </div>
      <RefundRequestDialog
        booking={refundBooking}
        onClose={() => setRefundBooking(null)}
        user={user}
      />
    </section>
  );
}

function App() {
  const initialRoute = getClientRoute();
  const [page, setPage] = useState(initialRoute.page);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollBadgeVisible, setScrollBadgeVisible] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);
  const [routeProgressActive, setRouteProgressActive] = useState(false);
  const [salonServices, setSalonServices] = useState(defaultServices);
  const [queueItems, setQueueItems] = useState([]);
  const [queueStats, setQueueStats] = useState({
    displayToken: 1,
    tokenLabel: "Next Token",
    tokenHint: "Next customer token",
    waitingCount: 0
  });
  const [queueLoading, setQueueLoading] = useState(true);
  const [profileTab, setProfileTab] = useState(initialRoute.tab);
  const [bookingGate, setBookingGate] = useState({
    loading: true,
    open: false,
    message: "Checking salon booking status...",
    openingTime: "07:00",
    closingTime: "23:00",
    manualShopClosed: false,
    premiumActive: false
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setLoginLoading(false);
      setLogoutLoading(false);

    });
  }, []);

  useEffect(() => {
    writeClientRoute({ page, tab: profileTab }, true);

    const syncRoute = () => {
      const nextRoute = getClientRoute();
      setPage(nextRoute.page);
      setProfileTab(nextRoute.tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    setQueueLoading(true);
    const today = toDateInputValue(new Date());
    const queueRef = firestoreQuery(
      collection(db, "customers"),
      where("bookingDate", "==", today)
    );

    return onSnapshot(
      queueRef,
      (snapshot) => {
        const todayBookings = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...snapshotDoc.data()
        }));
        const activeBookings = todayBookings
          .filter((booking) =>
            activeBookingStatuses.has(String(booking.status || "").toLowerCase())
          )
          .sort((first, second) => {
            return (
              (first.createdAt?.toMillis?.() || 0) -
              (second.createdAt?.toMillis?.() || 0)
            );
          });
        const waitingBookings = activeBookings.filter((booking) =>
          ["waiting", "waitlist"].includes(
            String(booking.status || "").toLowerCase()
          )
        );
        const currentBooking = activeBookings.find(
          (booking) => String(booking.status || "").toLowerCase() === "in_chair"
        );
        const nextWaitingBooking =
          waitingBookings.find(
            (booking) => String(booking.status || "").toLowerCase() === "waiting"
          ) || waitingBookings[0];
        const displayBooking = currentBooking || nextWaitingBooking;
        const displayBookingIndex = displayBooking
          ? activeBookings.findIndex((booking) => booking.id === displayBooking.id)
          : -1;

        setQueueItems(
          activeBookings.slice(0, 5).map((booking, index) =>
            normalizeQueueItem({ id: booking.id, data: () => booking }, index + 1)
          )
        );
        setQueueStats({
          displayToken:
            displayBookingIndex >= 0 ? displayBookingIndex + 1 : 1,
          tokenLabel: currentBooking
            ? "Now Serving"
            : nextWaitingBooking
              ? "Next Token"
              : "Next New Token",
          tokenHint: currentBooking
            ? "Customer in chair"
            : nextWaitingBooking
              ? "Next customer to call"
              : "Queue empty now",
          waitingCount: waitingBookings.length
        });
        setQueueLoading(false);
      },
      () => {
        setQueueItems([]);
        setQueueStats({
          displayToken: 1,
          tokenLabel: "Next Token",
          tokenHint: "Queue empty now",
          waitingCount: 0
        });
        setQueueLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    const servicesRef = firestoreQuery(
      collection(db, "services")
    );

    return onSnapshot(
      servicesRef,
      (snapshot) => {
        const nextServices = snapshot.docs
          .map(normalizeService)
          .filter((service) => service.active)
          .sort(
            (first, second) =>
              first.sortOrder - second.sortOrder ||
              first.title.localeCompare(second.title)
          );
        setSalonServices(nextServices.length ? nextServices : defaultServices);
      },
      () => {
        setSalonServices(defaultServices);
      }
    );
  }, []);

  useEffect(() => {
    const salonRef = firestoreQuery(
      collection(db, "salons"),
      where("slug", "==", SALON_SLUG),
      limit(1)
    );

    return onSnapshot(
      salonRef,
      (snapshot) => {
        const salonDoc = snapshot.docs[0];

        if (!salonDoc) {
          setBookingGate({
            loading: false,
            open: false,
            message: BOOKING_CLOSED_MESSAGE,
            openingTime: "07:00",
            closingTime: "23:00",
            manualShopClosed: false,
            premiumActive: false
          });
          return;
        }

        const salon = salonDoc.data();
        const premiumUntilTime = salon.premiumUntil
          ? Date.parse(salon.premiumUntil)
          : null;
        const premiumActive =
          salon.premiumEnabled === true &&
          salon.paymentStatus === "active" &&
          (!premiumUntilTime || premiumUntilTime > Date.now());
        const scheduleGate = {
          openingTime: salon.openingTime || "07:00",
          closingTime: salon.closingTime || "23:00"
        };
        const manualClosed = salon.manualShopClosed === true;
        const withinBookingHours = isCustomerBookingWindowOpen(scheduleGate);
        const open = premiumActive && !manualClosed && withinBookingHours;
        const message = manualClosed
          ? salon.manualCloseReason ||
            "Shop is closed for booking. Please try again later."
          : premiumActive
            ? withinBookingHours
              ? "Booking open"
              : getBookingWindowMessage(scheduleGate)
            : BOOKING_CLOSED_MESSAGE;

        setBookingGate({
          loading: false,
          open,
          message,
          openingTime: scheduleGate.openingTime,
          closingTime: scheduleGate.closingTime,
          manualShopClosed: manualClosed,
          premiumActive
        });
      },
      () => {
        setBookingGate({
          loading: false,
          open: false,
          message: BOOKING_CLOSED_MESSAGE,
          openingTime: "07:00",
          closingTime: "23:00",
          manualShopClosed: false,
          premiumActive: false
        });
      }
    );
  }, []);

  useEffect(() => {
    const refreshBookingGate = () => {
      setBookingGate((current) => {
        if (current.loading || current.manualShopClosed) return current;

        const withinBookingHours = isCustomerBookingWindowOpen(current);
        const open = current.premiumActive && withinBookingHours;
        const message = current.premiumActive
          ? withinBookingHours
            ? "Booking open"
            : getBookingWindowMessage(current)
          : BOOKING_CLOSED_MESSAGE;

        if (current.open === open && current.message === message) return current;
        return { ...current, open, message };
      });
    };

    refreshBookingGate();
    const timer = window.setInterval(refreshBookingGate, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let hideTimer;

    const updateScrollProgress = () => {
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || 0;
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress =
        scrollHeight <= 0 ? 0 : Math.min(100, (scrollTop / scrollHeight) * 100);
      setScrollProgress(nextProgress);
      setScrollBadgeVisible(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setScrollBadgeVisible(false), 900);
    };

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress);

    return () => {
      window.clearTimeout(hideTimer);
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
    };
  }, [page]);

  const navigatePage = (nextPage, nextTabOverride) => {
    const nextTab =
      nextPage === "profile" ? nextTabOverride || profileTab : "account";
    setRouteProgressActive(true);
    setScrollBadgeVisible(true);
    setRouteProgress(18);
    setPage(nextPage);
    if (nextPage !== "profile") {
      setProfileTab("account");
    }
    writeClientRoute({ page: nextPage, tab: nextTab });
    window.scrollTo({ top: 0, behavior: "smooth" });

    window.setTimeout(() => setRouteProgress(72), 120);
    window.setTimeout(() => setRouteProgress(100), 280);
    window.setTimeout(() => {
      setRouteProgressActive(false);
      setRouteProgress(0);
      setScrollProgress(0);
      setScrollBadgeVisible(false);
    }, 520);
  };

  const login = async () => {
    setAuthError("");
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const message = error.message || "Login failed";
      setAuthError(message);
      toast.error(message);
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    setLogoutLoading(true);
    setSelectedService(null);
    try {
      await signOut(auth);
      setConfirmLogoutOpen(false);
      if (page === "profile") {
        navigatePage("home");
      }
    } catch (error) {
      const message = error.message || "Logout failed";
      setAuthError(message);
      toast.error(message);
      setLogoutLoading(false);
    }
  };

  const requestLogout = () => {
    setConfirmLogoutOpen(true);
  };

  const selectService = (service) => {
    setSelectedService(service);
  };

  const requestServiceSelection = (service) => {
    if (bookingGate.loading) {
      toast.info("Checking salon booking status...");
      return;
    }

    if (!bookingGate.open) {
      toast.error(BOOKING_CLOSED_MESSAGE);
      return;
    }

    selectService(service);
  };

  const handleBookingSuccess = () => {
    setSelectedService(null);
    setProfileTab("bookings");
    navigatePage("profile", "bookings");
  };

  const changeProfileTab = (tab) => {
    setProfileTab(tab);
    writeClientRoute({ page: "profile", tab });
  };

  if (authLoading) {
    return <PageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] text-[#182022]">
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: "18px",
            border: "1px solid #d9e5df",
            boxShadow: "0 18px 60px rgba(18, 57, 52, 0.16)"
          }
        }}
      />
      <Header
        onLogin={login}
        authLoading={authLoading}
        loginLoading={loginLoading}
        onNavigate={navigatePage}
        page={page}
        routeProgress={routeProgress}
        routeProgressActive={routeProgressActive}
        scrollProgress={scrollProgress}
        user={user}
      />
      {authError ? (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm font-bold text-[#b91c1c]">
            {authError}
          </p>
        </div>
      ) : null}
      {page === "home" ? (
        <HomePage
          bookingGate={bookingGate}
          loginLoading={loginLoading}
          onLogin={login}
          onNavigate={navigatePage}
        onServiceSelect={requestServiceSelection}
        queueItems={queueItems}
        queueStats={queueStats}
        queueLoading={queueLoading}
          services={salonServices.slice(0, 4)}
        user={user}
      />
      ) : null}
      {page === "booking" ? (
        <BookingPage
          bookingGate={bookingGate}
          loginLoading={loginLoading}
          onLogin={login}
          onServiceSelect={requestServiceSelection}
          services={salonServices}
          user={user}
        />
      ) : null}
      {page === "about" ? <AboutPage /> : null}
      {page === "contact" ? <ContactPage /> : null}
      {legalPages.includes(page) ? <LegalPage page={page} /> : null}
      {page === "profile" ? (
        <ProfilePage
          activeTab={profileTab}
          loginLoading={loginLoading}
          logoutLoading={logoutLoading}
          onLogin={login}
          onLogout={requestLogout}
          onTabChange={changeProfileTab}
          user={user}
        />
      ) : null}
      <CheckoutModal
        bookingGate={bookingGate}
        onBookingSuccess={handleBookingSuccess}
        onClose={() => setSelectedService(null)}
        service={selectedService}
        user={user}
      />
      {confirmLogoutOpen ? (
        <ConfirmDialog
          confirmLabel="Logout"
          loading={logoutLoading}
          message="Are you sure you want to logout from your account?"
          onCancel={() => setConfirmLogoutOpen(false)}
          onConfirm={logout}
          title="Confirm logout"
          tone="danger"
        />
      ) : null}
      <ScrollPercentBadge
        value={scrollProgress}
        visible={scrollBadgeVisible || routeProgressActive}
      />
      <footer className="mt-8 border-t border-[#e4eee8] bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 text-sm text-[#637371] md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-bold text-[#173734]">Santosh Salon Queue</p>
            <p className="mt-1">Open daily, 7 AM - 11 PM</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...legalPages, "contact"].map((item) => (
              <button
                className="rounded-full bg-[#f6faf8] px-4 py-2 font-bold text-[#173734] transition hover:bg-[#ecfdf5] hover:text-[#0f766e]"
                key={item}
                onClick={() => navigatePage(item)}
                type="button"
              >
                {titleCase(item)}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
