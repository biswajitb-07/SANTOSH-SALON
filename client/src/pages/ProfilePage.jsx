import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  query as firestoreQuery,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import {
  CalendarClock,
  CalendarCheck2,
  Clock3,
  Download,
  Eye,
  Gift,
  LogIn,
  LogOut,
  MessageCircle,
  Share2,
  Star,
  UserRound,
  X
} from "lucide-react";
import {
  ButtonSpinner,
  PaginationControls,
  UserAvatar,
  useBodyScrollLock
} from "../components/common.jsx";
import { db } from "../lib/firebase.js";
import { getSafeErrorMessage } from "../lib/errors.js";
import {
  formatBookingStatus,
  formatMoney,
  formatStatus
} from "../lib/formatters.js";
import { downloadBookingInvoice } from "../lib/invoice.js";

const BOOKING_PAGE_SIZE = 5;
const STAFF_COUNT = 3;
const PLATFORM_FEE_PER_PERSON = 2;
const SERVICE_ESTIMATE_MINUTES = {
  haircut: 25,
  beard: 15,
  facial: 40,
  wash: 20,
  color: 60,
  default: 25
};
const cancelReasons = [
  "I cannot visit today",
  "Booked wrong time",
  "Booked wrong service",
  "Payment or booking issue",
  "Other reason"
];
const queueCountStatuses = new Set(["confirmed", "waiting", "in_chair"]);
const rescheduleSlots = [
  ["07:00", "7:00 AM"],
  ["07:30", "7:30 AM"],
  ["08:00", "8:00 AM"],
  ["08:30", "8:30 AM"],
  ["09:00", "9:00 AM"],
  ["09:30", "9:30 AM"],
  ["10:00", "10:00 AM"],
  ["10:30", "10:30 AM"],
  ["11:00", "11:00 AM"],
  ["11:30", "11:30 AM"],
  ["12:00", "12:00 PM"],
  ["12:30", "12:30 PM"],
  ["14:00", "2:00 PM"],
  ["14:30", "2:30 PM"],
  ["15:00", "3:00 PM"],
  ["15:30", "3:30 PM"],
  ["16:00", "4:00 PM"],
  ["16:30", "4:30 PM"],
  ["17:00", "5:00 PM"],
  ["17:30", "5:30 PM"],
  ["18:00", "6:00 PM"],
  ["18:30", "6:30 PM"],
  ["19:00", "7:00 PM"],
  ["19:30", "7:30 PM"],
  ["20:00", "8:00 PM"],
  ["20:30", "8:30 PM"],
  ["21:00", "9:00 PM"],
  ["21:30", "9:30 PM"],
  ["22:00", "10:00 PM"]
];

const getBarberStatsId = (barberName = "") =>
  String(barberName || "barber")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "barber";

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDisplayDate = (dateValue) =>
  new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

const getServiceEstimateMinutes = (service = "") => {
  const normalized = service.toLowerCase();
  const key = Object.keys(SERVICE_ESTIMATE_MINUTES).find((item) =>
    normalized.includes(item)
  );
  return SERVICE_ESTIMATE_MINUTES[key] || SERVICE_ESTIMATE_MINUTES.default;
};

const getLiveWaitEstimate = (booking) => {
  if (!booking) return "-";
  if (booking.status === "waitlist") return "Admin will confirm your slot";
  if (!["waiting", "in_chair"].includes(booking.status)) return "-";
  if (booking.status === "in_chair") return "Serving now";
  const estimate =
    Math.ceil(Number(booking.peopleAhead || 0) / STAFF_COUNT) *
    getServiceEstimateMinutes(booking.service);
  return estimate <= 0 ? "Your turn is near" : `${estimate} min approx`;
};

const getRefundStepIndex = (status = "") => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return 2;
  if (["processing", "reviewing"].includes(normalized)) return 1;
  if (normalized) return 0;
  return -1;
};

const normalizeUserBooking = (snapshotDoc) => {
  const data = snapshotDoc.data();
  const createdAtDate = data.createdAt?.toDate?.();
  const bookingGroupSize = Number(data.bookingGroupSize || 1);
  const serviceAmount = Number(data.serviceAmount || data.amount || 0);
  const explicitCashfreeFee =
    data.nonRefundableFee ?? data.cashfreeFeeShare ?? data.customerCashfreeFee;
  const storedCashfreeFee = Number(data.cashfreeFee || 0);
  const groupCashfreeFee = Number(data.groupCashfreeFee || data.cashfreeFee || 0);
  const cashfreeFee =
    String(data.paymentProvider || "").toLowerCase() === "cashfree"
      ? explicitCashfreeFee !== undefined
        ? Number(explicitCashfreeFee || 0)
        : data.groupCashfreeFee !== undefined
          ? storedCashfreeFee
          : Math.round((groupCashfreeFee / bookingGroupSize) * 100) / 100
      : 0;
  const payableAmount = Number(
    data.payableAmount && Number(data.payableAmount) > serviceAmount
      ? data.payableAmount
      : serviceAmount + cashfreeFee + Number(data.platformFee || 0)
  );
  const platformFee = Number(data.platformFee || 0);

  return {
    id: snapshotDoc.id,
    token: data.token || "-",
    peopleAhead:
      data.peopleAhead !== undefined
        ? Number(data.peopleAhead || 0)
        : Math.max(0, Number(data.token || 1) - 1),
    name: data.name || data.customerName || "Customer",
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
    amount: payableAmount,
    serviceAmount,
    cashfreeFee,
    platformFee,
    cashfreeFeePercent: Number(data.cashfreeFeePercent || 1.6),
    refundableAmount: Number(data.refundableAmount || serviceAmount),
    nonRefundableFee: Number(data.nonRefundableFee || cashfreeFee + platformFee),
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
    cancelReason: data.cancelReason || "",
    adminRefundNote: data.adminRefundNote || "",
    barberName: data.barberName || data.preferredBarber || "Next available barber",
    barberRating: Number(data.barberRating || 0),
    barberReview: data.barberReview || "",
    notifiedAt: data.notifiedAt || null,
    customerType: data.customerType || "self",
    bookingGroupId: data.bookingGroupId || "",
    bookingGroupSize,
    bookingGroupIndex: Number(data.bookingGroupIndex || 1),
    createdSort: data.createdSort || 0,
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

const getBookingMinutes = (booking) => {
  const [hour = "99", minute = "0"] = String(booking.timeSlot || "").split(":");
  return Number(hour) * 60 + Number(minute);
};

const sortUserBookings = (bookings) =>
  [...bookings].sort((first, second) => {
    const firstActive = ["confirmed", "waiting", "waitlist", "in_chair"].includes(first.status)
      ? 0
      : 1;
    const secondActive = ["confirmed", "waiting", "waitlist", "in_chair"].includes(second.status)
      ? 0
      : 1;
    if (firstActive !== secondActive) return firstActive - secondActive;

    const firstDate = first.bookingLabel || "";
    const secondDate = second.bookingLabel || "";
    const dateDiff = firstDate.localeCompare(secondDate);
    if (!firstActive && dateDiff) return dateDiff;

    const slotDiff = getBookingMinutes(first) - getBookingMinutes(second);
    if (!firstActive && slotDiff) return slotDiff;

    const tokenDiff = Number(first.token || 0) - Number(second.token || 0);
    if (!firstActive && tokenDiff) return tokenDiff;

    const firstCreated = first.createdSort || first.createdAt?.getTime?.() || 0;
    const secondCreated = second.createdSort || second.createdAt?.getTime?.() || 0;
    return secondCreated - firstCreated;
  });

const groupUserBookings = (bookings) =>
  sortUserBookings(bookings).reduce((groups, booking) => {
    const groupKey = booking.bookingGroupId || booking.id;
    const existingGroup = groups.find((group) => group.key === groupKey);

    if (existingGroup) {
      existingGroup.items = sortUserBookings([...existingGroup.items, booking]);
      existingGroup.totalAmount = existingGroup.items.reduce(
        (total, item) => total + Number(item.amount || 0),
        0
      );
      existingGroup.totalServiceAmount = existingGroup.items.reduce(
        (total, item) => total + Number(item.serviceAmount || 0),
        0
      );
      existingGroup.totalCashfreeFee = existingGroup.items.reduce(
        (total, item) => total + Number(item.cashfreeFee || 0),
        0
      );
      existingGroup.totalPlatformFee = existingGroup.items.reduce(
        (total, item) => total + Number(item.platformFee || 0),
        0
      );
      return groups;
    }

    groups.push({
      key: groupKey,
      items: [booking],
      totalAmount: Number(booking.amount || 0),
      totalServiceAmount: Number(booking.serviceAmount || 0),
      totalCashfreeFee: Number(booking.cashfreeFee || 0),
      totalPlatformFee: Number(booking.platformFee || 0)
    });
    return groups;
  }, []);

function RefundStatusTracker({ refund }) {
  if (!refund) return null;
  const stepIndex = getRefundStepIndex(refund.status);
  const steps = ["Requested", "Processing", "Completed"];

  return (
    <div className="mt-3 rounded-2xl border border-[#35201f] bg-[#101a18] px-4 py-5">
      <div className="relative grid grid-cols-3">
        <span className="absolute left-[16.5%] right-[16.5%] top-4 h-1 rounded-full bg-[#2a1111]" />
        <span
          className="absolute left-[16.5%] top-4 h-1 rounded-full bg-[#f9c66d] transition-all"
          style={{ width: `${Math.max(0, stepIndex) * 33.33}%` }}
        />
        {steps.map((step, index) => (
          <div
            className="relative z-[1] flex flex-col items-center gap-2 text-center"
            key={step}
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-full border-4 text-xs font-black ${
                index <= stepIndex
                  ? "border-[#f9c66d] bg-[#991b1b] text-white"
                  : "border-[#35201f] bg-[#0b1714] text-[#637371]"
              }`}
            >
              {index + 1}
            </span>
            <span
              className={`text-[11px] font-black ${
                index <= stepIndex ? "text-[#f9c66d]" : "text-[#637371]"
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
      {refund.adminRefundNote ? (
        <p className="mt-3 rounded-xl bg-[#24170d] px-3 py-2 text-xs font-bold text-[#f9c66d]">
          Admin note: {refund.adminRefundNote}
        </p>
      ) : null}
    </div>
  );
}

function CancelReasonDialog({ booking, loading, onClose, onConfirm }) {
  const [reason, setReason] = useState(cancelReasons[0]);
  const [note, setNote] = useState("");
  useBodyScrollLock(Boolean(booking));

  useEffect(() => {
    setReason(cancelReasons[0]);
    setNote("");
  }, [booking]);

  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/65 px-3 py-3 backdrop-blur-md sm:items-center sm:py-6">
      <form
        className="queue-shadow w-full max-w-lg rounded-3xl border border-[#f9c66d]/15 bg-[#081311] p-5 text-[#f4fbf8]"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(booking, reason, note);
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-kicker">Cancel Booking</p>
            <h2 className="mt-1 text-2xl font-black">Select a reason</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b1714]" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <div className="mt-5 grid gap-2">
          {cancelReasons.map((item) => (
            <label className="flex items-center gap-3 rounded-2xl border border-[#35201f] bg-[#0b1714] px-4 py-3 text-sm font-black" key={item}>
              <input
                checked={reason === item}
                className="h-4 w-4 accent-[#991b1b]"
                onChange={() => setReason(item)}
                type="radio"
              />
              {item}
            </label>
          ))}
        </div>
        <textarea
          className="mt-4 min-h-24 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] p-4 text-[#f4fbf8] outline-none focus:border-[#f87171]"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
          value={note}
        />
        <button
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 font-black text-white disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? <ButtonSpinner /> : null}
          {loading ? "Cancelling..." : "Confirm Cancellation"}
        </button>
      </form>
    </div>
  );
}

function RescheduleDialog({ booking, loading, onClose, onConfirm }) {
  const today = toDateInputValue(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = toDateInputValue(tomorrowDate);
  const [draft, setDraft] = useState({
    bookingDate: booking?.bookingDate || today,
    timeSlot: booking?.timeSlot || rescheduleSlots[0][0]
  });
  useBodyScrollLock(Boolean(booking));

  useEffect(() => {
    setDraft({
      bookingDate: booking?.bookingDate || today,
      timeSlot: booking?.timeSlot || rescheduleSlots[0][0]
    });
  }, [booking, today]);

  if (!booking) return null;

  const selectedSlot = rescheduleSlots.find(([value]) => value === draft.timeSlot);

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/65 px-3 py-3 backdrop-blur-md sm:items-center sm:py-6">
      <form
        className="queue-shadow w-full max-w-lg rounded-3xl border border-[#f9c66d]/15 bg-[#081311] p-5 text-[#f4fbf8]"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(booking, draft, selectedSlot?.[1] || draft.timeSlot);
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-kicker">Reschedule</p>
            <h2 className="mt-1 text-2xl font-black">{booking.service}</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b1714]" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-bold">Booking day</span>
          <select
            className="h-12 w-full rounded-2xl border border-[#35201f] bg-[#0b1714] px-4 outline-none"
            onChange={(event) => setDraft((value) => ({ ...value, bookingDate: event.target.value }))}
            value={draft.bookingDate}
          >
            <option value={today}>Today, {getDisplayDate(today)}</option>
            <option value={tomorrow}>Tomorrow, {getDisplayDate(tomorrow)}</option>
          </select>
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold">Time slot</span>
          <select
            className="h-12 w-full rounded-2xl border border-[#35201f] bg-[#0b1714] px-4 outline-none"
            onChange={(event) => setDraft((value) => ({ ...value, timeSlot: event.target.value }))}
            value={draft.timeSlot}
          >
            {rescheduleSlots.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <p className="mt-4 rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] px-4 py-3 text-sm font-bold text-[#f9c66d]">
          Reschedule request updates your booking slot. Admin may adjust it if salon capacity changes.
        </p>
        <button
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 font-black text-white disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? <ButtonSpinner /> : <CalendarClock size={18} />}
          {loading ? "Rescheduling..." : "Save New Slot"}
        </button>
      </form>
    </div>
  );
}

function RefundRequestDialog({ booking, user, onClose }) {
  useBodyScrollLock(Boolean(booking));

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
      toast.error("Payment ID or Order ID is required for a refund.");
      return;
    }

    setSubmitting(true);
    try {
      const refundRef = await addDoc(collection(db, "refundRequests"), {
        userId: user.uid,
        bookingId: booking.id,
        bookingGroupId: booking.bookingGroupId || booking.id,
        bookingGroupIndex: booking.bookingGroupIndex || 1,
        bookingGroupSize: booking.bookingGroupSize || 1,
        refundScope: "single_booking",
        partialRefund: true,
        token: booking.token,
        service: booking.service,
        bookingStatus: booking.status,
        customerName: booking.name || user.displayName || "Customer",
        customerEmail: user.email || "",
        customerMobile: booking.mobile,
        paymentId: form.paymentId.trim(),
        transactionId:
          booking.transactionId && booking.transactionId !== "-"
            ? booking.transactionId
            : "",
        orderId: form.orderId.trim(),
        amount: Number(booking.refundableAmount || booking.serviceAmount || 0),
        paidAmount: Number(booking.amount || 0),
        cashfreeFee: Number(booking.cashfreeFee || 0),
        platformFee: Number(booking.platformFee || 0),
        nonRefundableFee: Number(
          booking.nonRefundableFee || booking.cashfreeFee + booking.platformFee || 0
        ),
        reason: form.reason.trim(),
        refundMethod: "original_payment_method",
        upiId: "",
        bankDetails: null,
        status: "requested",
        expectedWindow: "5-7 business days",
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
      toast.error(getSafeErrorMessage(error, "Refund request could not be sent."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/65 px-2 py-2 backdrop-blur-md sm:items-center sm:px-4 sm:py-6">
      <form
        className="queue-shadow max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-[1.25rem] border border-[#f9c66d]/15 bg-[#081311]/95 p-4 text-[#f4fbf8] sm:max-h-[90vh] sm:max-w-2xl sm:rounded-[2rem] sm:p-6"
        onSubmit={submitRefund}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="section-kicker">
              Refund Request
            </p>
            <h2 className="mt-1 break-words text-2xl font-black leading-tight sm:text-3xl">
              {booking.service}
            </h2>
            <p className="mt-2 text-sm font-bold leading-relaxed text-[#9db2ad]">
              <span className="break-words">{booking.name}</span>
              <span className="mx-1.5 text-[#5f706b]">•</span>
              <span>Token {booking.token}</span>
              <span className="mx-1.5 text-[#5f706b]">•</span>
              <span>Refund {formatMoney(booking.refundableAmount)}</span>
            </p>
          </div>
          <button
            aria-label="Close refund request"
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-[#35201f] bg-[#0b1714] text-[#f4fbf8] transition hover:border-[#f9c66d]/35 sm:h-11 sm:w-11 sm:rounded-2xl"
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
                className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] px-4 text-[#f4fbf8] outline-none focus:border-[#f87171]"
                onChange={(event) => updateField(field, event.target.value)}
                placeholder={label}
                value={form[field]}
              />
            </label>
          ))}
        </div>

        <p className="mt-4 rounded-2xl border border-[#f87171]/20 bg-[#3a1515] px-4 py-3 text-sm font-bold leading-relaxed text-[#fee2e2]">
          This is a partial refund for this one booking only. Other people in
          the same Cashfree payment stay active. Refunds usually complete in
          5-7 business days.
        </p>
        {booking.cashfreeFee > 0 || booking.platformFee > 0 ? (
          <div className="mt-3 grid gap-2 rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] p-4 text-sm font-black text-[#f9c66d]">
            <div className="flex flex-wrap justify-between gap-2">
              <span>Total paid</span>
              <span>{formatMoney(booking.amount)}</span>
            </div>
            {booking.platformFee > 0 ? (
              <div className="flex flex-wrap justify-between gap-2">
                <span>Platform fee not refundable</span>
                <span>{formatMoney(booking.platformFee)}</span>
              </div>
            ) : null}
            {booking.cashfreeFee > 0 ? (
              <div className="flex flex-wrap justify-between gap-2">
                <span>Cashfree charge not refundable</span>
                <span>{formatMoney(booking.cashfreeFee)}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-between gap-2 border-t border-[#f9c66d]/20 pt-2">
              <span>Refund eligible</span>
              <span>{formatMoney(booking.refundableAmount)}</span>
            </div>
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold">Reason</span>
          <textarea
            className="min-h-24 w-full resize-y rounded-2xl border border-[#4a2525] bg-[#0b1714] p-4 text-[#f4fbf8] outline-none focus:border-[#f87171]"
            onChange={(event) => updateField("reason", event.target.value)}
            placeholder="Refund reason"
            value={form.reason}
          />
        </label>

        <button
          className="shine-button mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-6 py-4 font-black text-white disabled:opacity-60"
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

export function ProfilePage({
  bookingsOnly = false,
  loginLoading,
  logoutLoading,
  onMyBookings,
  onLogin,
  onLogout,
  user
}) {
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [refundRequests, setRefundRequests] = useState([]);
  const [refundBooking, setRefundBooking] = useState(null);
  const [cancelBookingId, setCancelBookingId] = useState("");
  const [pendingCancelBooking, setPendingCancelBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleBookingId, setRescheduleBookingId] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const [selectedBookingGroupKey, setSelectedBookingGroupKey] = useState("");
  const groupedBookings = groupUserBookings(bookings).slice(0, 5);

  const totalBookingPages = Math.max(
    1,
    Math.ceil(groupedBookings.length / BOOKING_PAGE_SIZE)
  );
  const safeBookingPage = Math.min(bookingPage, totalBookingPages);
  const paginatedBookingGroups = groupedBookings.slice(
    (safeBookingPage - 1) * BOOKING_PAGE_SIZE,
    safeBookingPage * BOOKING_PAGE_SIZE
  );
  const selectedBookingGroup =
    groupedBookings.find((group) => group.key === selectedBookingGroupKey) ||
    null;

  useBodyScrollLock(Boolean(bookingsOnly && selectedBookingGroup));

  useEffect(() => {
    setBookingPage(1);
  }, [groupedBookings.length]);

  useEffect(() => {
    if (selectedBookingGroupKey && !selectedBookingGroup) {
      setSelectedBookingGroupKey("");
    }
  }, [selectedBookingGroup, selectedBookingGroupKey]);

  useEffect(() => {
    if (!user || !bookingsOnly) {
      setBookings([]);
      setBookingsLoading(false);
      return undefined;
    }

    setBookingsLoading(true);
    const bookingsRef = firestoreQuery(
      collection(db, "customers"),
      where("userId", "==", user.uid),
      limit(10)
    );

    return onSnapshot(
      bookingsRef,
      (snapshot) => {
        const nextBookings = sortUserBookings(
          snapshot.docs.map(normalizeUserBooking)
        );
        setBookings(nextBookings);
        setBookingsLoading(false);
      },
      () => {
        setBookings([]);
        setBookingsLoading(false);
      }
    );
  }, [user, bookingsOnly]);

  useEffect(() => {
    if (!user || !bookingsOnly) {
      setRefundRequests([]);
      return undefined;
    }

    const refundsRef = firestoreQuery(
      collection(db, "refundRequests"),
      where("userId", "==", user.uid),
      limit(5)
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
  }, [user, bookingsOnly]);

  const cancelBooking = async (booking, reason, note) => {
    if (!booking || !["waiting", "waitlist"].includes(booking.status)) return;

    setCancelBookingId(booking.id);
    try {
      await updateDoc(doc(db, "customers", booking.id), {
        status: "cancelled",
        cancelledBy: "customer",
        cancelReason: reason || "Customer cancelled",
        cancelNote: note?.trim() || "",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const previousStatus = String(booking.status || "").toLowerCase();
      const counterPatch = {
        bookingDate: booking.bookingDate,
        updatedAt: serverTimestamp()
      };
      if (queueCountStatuses.has(previousStatus)) {
        counterPatch.confirmedCount = increment(-1);
        if (booking.timeSlot) {
          counterPatch[`slotCounts.${booking.timeSlot}`] = increment(-1);
        }
      } else if (previousStatus === "waitlist") {
        counterPatch.waitlistCount = increment(-1);
      }

      if (counterPatch.confirmedCount || counterPatch.waitlistCount) {
        await setDoc(doc(db, "bookingCounters", booking.bookingDate), counterPatch, {
          merge: true
        });
      }

      if (
        booking.paymentProvider === "cashfree" &&
        booking.paymentStatus === "paid"
      ) {
        toast.success("Booking cancelled. Refund request option is now available.");
      } else {
        toast.success("Booking cancelled.");
      }
      setPendingCancelBooking(null);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Booking could not be cancelled."));
    } finally {
      setCancelBookingId("");
    }
  };

  const rescheduleCustomerBooking = async (booking, draft, slotLabel) => {
    if (!booking || !["waiting", "waitlist"].includes(booking.status)) return;

    setRescheduleBookingId(booking.id);
    try {
      const today = toDateInputValue(new Date());
      const bookingDate = draft.bookingDate || today;
      await updateDoc(doc(db, "customers", booking.id), {
        bookingDate,
        bookingDay: bookingDate === today ? "today" : "scheduled",
        bookingLabel: bookingDate === today ? "Today" : "Scheduled",
        bookingDisplayDate: getDisplayDate(bookingDate),
        timeSlot: draft.timeSlot,
        timeSlotLabel: slotLabel,
        rescheduleRequestedBy: "customer",
        rescheduledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const previousStatus = String(booking.status || "").toLowerCase();
      if (queueCountStatuses.has(previousStatus)) {
        const counterUpdates = [];
        if (booking.bookingDate && booking.timeSlot) {
          counterUpdates.push(
            setDoc(
              doc(db, "bookingCounters", booking.bookingDate),
              {
                bookingDate: booking.bookingDate,
                confirmedCount: increment(-1),
                [`slotCounts.${booking.timeSlot}`]: increment(-1),
                updatedAt: serverTimestamp()
              },
              { merge: true }
            )
          );
        }
        if (bookingDate && draft.timeSlot) {
          counterUpdates.push(
            setDoc(
              doc(db, "bookingCounters", bookingDate),
              {
                bookingDate,
                confirmedCount: increment(1),
                [`slotCounts.${draft.timeSlot}`]: increment(1),
                updatedAt: serverTimestamp()
              },
              { merge: true }
            )
          );
        }
        await Promise.all(counterUpdates);
      }

      toast.success("Booking rescheduled.");
      setRescheduleBooking(null);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Booking could not be rescheduled."));
    } finally {
      setRescheduleBookingId("");
    }
  };

  const shareBookingInvoice = async (booking) => {
    const text = `${booking.service} booking for ${booking.name}. Token ${booking.token}. Amount ${formatMoney(booking.amount)}. Status ${formatBookingStatus(booking.status)}.`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Santosh Salon booking receipt",
          text
        });
      } else {
        await navigator.clipboard?.writeText(text);
        toast.success("Receipt details copied.");
      }
    } catch {
      toast.info("Receipt share cancelled.");
    }
  };

  const rateBarber = async (booking, rating) => {
    if (!booking?.id || booking.status !== "completed") return;

    try {
      const previousRating = Number(booking.barberRating || 0);
      const ratingDelta = rating - previousRating;
      await updateDoc(doc(db, "customers", booking.id), {
        barberRating: rating,
        barberRatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      if (booking.barberName && booking.barberName !== "Next available barber") {
        const nextRatingCount = increment(previousRating > 0 ? 0 : 1);
        await setDoc(
          doc(db, "barberStats", getBarberStatsId(booking.barberName)),
          {
            name: booking.barberName,
            ratingTotal: increment(ratingDelta),
            ratingCount: nextRatingCount,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }
      toast.success(`You rated ${booking.barberName} ${rating} star${rating === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Rating could not be saved."));
    }
  };

  const getBookingViewState = (booking) => {
    const activeBooking = ["confirmed", "waiting", "waitlist", "in_chair"].includes(
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
                ? "Online paid booking cancelled. You can request a refund for the service amount. Cashfree charges are non-refundable."
                : booking.status === "cancelled"
                  ? "Booking cancelled."
                  : ["waiting", "waitlist"].includes(booking.status)
                    ? "You can cancel this booking before service starts."
                    : "Queue status is updating live.";

    return {
      activeBooking,
      bookingRefund,
      refundInProgress,
      turnLabel,
      helperText
    };
  };

  if (!user) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="luxury-glass rounded-[2rem] p-6 text-center queue-shadow sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#effaf7] text-[#991b1b]">
            <UserRound size={26} />
          </span>
          <h1 className="mt-5 text-3xl font-black">Login required</h1>
          <p className="mt-3 leading-7 text-[#637371]">
            Log in to view your {bookingsOnly ? "bookings" : "profile"}.
          </p>
          <button
            className="mx-auto mt-5 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#1a0f12] px-6 py-4 font-black text-white disabled:opacity-70"
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
      {!bookingsOnly ? (
      <div className="luxury-glass rounded-[2rem] p-6 queue-shadow sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <UserAvatar size="h-20 w-20" user={user} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                Profile
              </p>
              <h1 className="mt-1 text-3xl font-black leading-tight text-[#f4fbf8] sm:text-4xl">
                {user.displayName || "Customer Profile"}
              </h1>
              <p className="mt-2 break-words text-sm font-bold text-[#637371]">
                {user.email || "Google account connected"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-6 py-4 font-black text-white"
              onClick={onMyBookings}
              type="button"
            >
              <CalendarCheck2 size={19} />
              My Bookings
            </button>
            <button
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#1a0f12] px-6 py-4 font-black text-white disabled:opacity-70"
              disabled={logoutLoading}
              onClick={onLogout}
              type="button"
            >
              {logoutLoading ? <ButtonSpinner /> : <LogOut size={19} />}
              {logoutLoading ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Name", user.displayName || "Not available"],
            ["Email", user.email || "Not available"],
            ["Login Provider", "Google"],
            ["Total Visits", String(bookings.filter((booking) => booking.status === "completed").length)],
            ["Loyalty Points", `${bookings.filter((booking) => booking.status === "completed").length * 10} pts`],
            ["User ID", user.uid]
          ].map(([label, value]) => (
            <div className="rounded-2xl border border-[#35201f] bg-[#0b1714] p-4" key={label}>
              <p className="text-sm font-bold text-[#9db2ad]">{label}</p>
              <p className="mt-1 break-words font-black text-[#f4fbf8]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      {bookingsOnly ? (
      <div
        className="luxury-glass scroll-mt-28 rounded-[2rem] p-6 queue-shadow sm:p-8"
      >
        <p className="section-kicker">
          Queue History
        </p>
        <h2 className="mt-2 text-3xl font-black">My bookings</h2>
        <div className="mt-6 grid gap-4">
          {bookingsLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                className="h-24 animate-pulse rounded-2xl bg-[#f6faf8]"
                key={index}
              />
            ))
          ) : groupedBookings.length ? (
            paginatedBookingGroups.map((group) => {
              const primaryBooking = group.items[0];
              const turns = group.items
                .filter((booking) => booking.status !== "waitlist")
                .map((booking) => Number(booking.token || 0))
                .filter(Boolean);
              const turnLabel = turns.length
                ? `Haircut turns #${Math.min(...turns)}${
                    turns.length > 1 ? `-${Math.max(...turns)}` : ""
                  }`
                : "Waiting list";
              const statusLabels = [
                ...new Set(
                  group.items.map((booking) => formatBookingStatus(booking.status))
                )
              ];
              const peopleAhead = group.items
                .map((booking) =>
                  ["confirmed", "waiting", "waitlist", "in_chair"].includes(booking.status)
                    ? Number(booking.peopleAhead || 0)
                    : null
                )
                .filter((value) => value !== null);

              return (
                <article
                  className="rounded-2xl border border-[#35201f] bg-[#0b1714] p-4"
                  key={group.key}
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#991b1b]">
                        {turnLabel}
                      </p>
                      <h3 className="mt-1 truncate text-xl font-black text-[#f4fbf8]">
                        {primaryBooking.service}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-[#637371]">
                        {group.items.length}{" "}
                        {group.items.length > 1 ? "people" : "person"} •{" "}
                        {primaryBooking.bookingLabel} •{" "}
                        {primaryBooking.timeSlotLabel ||
                          primaryBooking.timeSlot ||
                          "Waiting list"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-[#f4fbf8]">
                        <span className="rounded-full bg-[#101a18] px-3 py-2">
                          Ahead:{" "}
                          {peopleAhead.length ? Math.min(...peopleAhead) : "-"}
                        </span>
                        <span className="rounded-full bg-[#101a18] px-3 py-2">
                          {formatMoney(group.totalAmount)}
                        </span>
                        {group.totalPlatformFee > 0 ? (
                          <span className="rounded-full bg-[#24170d] px-3 py-2 text-[#f9c66d]">
                            Platform fee {formatMoney(group.totalPlatformFee)}
                          </span>
                        ) : null}
                        {group.totalCashfreeFee > 0 ? (
                          <span className="rounded-full bg-[#24170d] px-3 py-2 text-[#f9c66d]">
                            Cashfree charge {formatMoney(group.totalCashfreeFee)}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-[#2a1111] px-3 py-2 text-[#991b1b]">
                          {statusLabels.join(", ")}
                        </span>
                        <span className="rounded-full bg-[#24170d] px-3 py-2 text-[#f9c66d]">
                          ETA {getLiveWaitEstimate(primaryBooking)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 font-black text-white"
                      onClick={() => setSelectedBookingGroupKey(group.key)}
                      type="button"
                    >
                      <Eye size={18} />
                      View Details
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[#35201f] bg-[#0b1714] p-6 text-center">
              <CalendarCheck2 className="mx-auto text-[#991b1b]" size={30} />
              <p className="mt-3 font-black">No bookings yet.</p>
              <p className="mt-1 text-sm font-bold text-[#637371]">
                Your bookings will appear here after you choose a service.
              </p>
            </div>
          )}
          {!bookingsLoading && groupedBookings.length ? (
            <PaginationControls
              onPageChange={setBookingPage}
              page={safeBookingPage}
              totalPages={totalBookingPages}
            />
          ) : null}
        </div>
      </div>
      ) : null}
      {bookingsOnly && selectedBookingGroup && typeof document !== "undefined" ? createPortal(
        <div className="modal-fade fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-3 py-3 backdrop-blur-md sm:px-5 sm:py-6">
          <div className="queue-shadow max-h-[calc(100dvh-1.5rem)] w-full max-w-[1180px] overflow-y-auto rounded-3xl border border-[#f9c66d]/15 bg-[#081311]/95 text-[#f4fbf8] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[2rem]">
            <div className="sticky top-0 z-10 border-b border-[#35201f] bg-[#081311]/95 p-4 backdrop-blur sm:p-6">
              <button
                className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-[#0b1714] text-[#f4fbf8] transition hover:bg-[#2a1111] sm:right-6 sm:top-6"
                onClick={() => setSelectedBookingGroupKey("")}
                type="button"
              >
                <X size={22} />
              </button>
              <div className="grid gap-4 pr-14 sm:pr-16">
              <div className="min-w-0">
                <p className="section-kicker">
                  Booking Details
                </p>
                <h2 className="mt-1 text-3xl font-black text-[#f4fbf8]">
                  {selectedBookingGroup.items[0].service}
                </h2>
                <p className="mt-1 font-bold text-[#9db2ad]">
                  {selectedBookingGroup.items.length}{" "}
                  {selectedBookingGroup.items.length > 1 ? "people" : "person"} •{" "}
                  {selectedBookingGroup.items[0].bookingLabel} •{" "}
                  {selectedBookingGroup.items[0].timeSlotLabel ||
                    selectedBookingGroup.items[0].timeSlot ||
                    "Waiting list"}
                </p>
                {selectedBookingGroup.items.length > 1 ? (
                  <p className="mt-3 rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] px-4 py-3 text-sm font-black text-[#f9c66d]">
                    This group was paid in one Cashfree order. Cancel/refund is
                    handled per person as a partial refund, so cancelling one
                    person does not refund the full group amount.
                  </p>
                ) : null}
              </div>
            </div>
            </div>

            <div className="grid gap-4 p-4 sm:p-6">
              {selectedBookingGroup.items.map((booking) => {
                const {
                  activeBooking,
                  bookingRefund,
                  refundInProgress,
                  turnLabel,
                  helperText
                } = getBookingViewState(booking);

                return (
                  <article
                    className="rounded-2xl border border-[#35201f] bg-[#0b1714] p-4"
                    key={booking.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#991b1b]">
                          {turnLabel}
                        </p>
                        <h3 className="mt-1 text-2xl font-black text-[#f4fbf8]">
                          {booking.name}
                        </h3>
                        <p className="mt-1 font-bold text-[#637371]">
                          {booking.customerType === "guest"
                            ? "Guest booking"
                            : "Primary booking"}{" "}
                          • {booking.mobile || "No mobile"}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#2a1111] px-3 py-1 text-xs font-black text-[#991b1b]">
                        {formatBookingStatus(booking.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {[
                        [
                          "People Ahead",
                          activeBooking ? booking.peopleAhead : "-"
                        ],
                        ["Live ETA", getLiveWaitEstimate(booking)],
                        ["Service Duration", `${getServiceEstimateMinutes(booking.service)} min approx`],
                        ["Barber", booking.barberName],
                        ["Service Amount", formatMoney(booking.serviceAmount)],
                        ["Platform Fee", formatMoney(booking.platformFee || 0)],
                        ["Cashfree Charge", formatMoney(booking.cashfreeFee)],
                        ["Total Paid", formatMoney(booking.amount)],
                        ["Method", formatStatus(booking.paymentProvider)],
                        ["Payment ID", booking.paymentId || "-"],
                        ["Order ID", booking.orderId || "-"],
                        ["Created", booking.createdAtTime]
                      ].map(([label, value]) => (
                        <div
                          className="rounded-2xl bg-[#101a18] px-3 py-2"
                          key={label}
                        >
                          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#637371]">
                            {label}
                          </p>
                          <p className="mt-1 break-words font-black text-[#f4fbf8]">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {booking.status === "completed" &&
                    booking.barberName &&
                    booking.barberName !== "Next available barber" ? (
                      <div className="mt-4 rounded-2xl border border-[#35201f] bg-[#101a18] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#637371]">
                              Rate Barber
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                              {booking.barberRating
                                ? `You rated ${booking.barberName} ${booking.barberRating}/5`
                                : `How was ${booking.barberName}?`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                aria-label={`Rate ${rating} star`}
                                className={`grid h-10 w-10 place-items-center rounded-xl border transition ${
                                  Number(booking.barberRating || 0) >= rating
                                    ? "border-[#f9c66d]/35 bg-[#24170d] text-[#f9c66d]"
                                    : "border-[#35201f] bg-[#0b1714] text-[#637371] hover:text-[#f9c66d]"
                                }`}
                                key={rating}
                                onClick={() => rateBarber(booking, rating)}
                                type="button"
                              >
                                <Star size={18} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#35201f] pt-3">
                      <p className="max-w-xl text-sm font-bold text-[#637371]">
                        {helperText}
                      </p>
                      <p className="w-full rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] px-3 py-2 text-xs font-black leading-5 text-[#f9c66d]">
                        Booking history automatically keeps only recent visits.
                        Download or share your invoice now if you need it later.
                      </p>
                      <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                        <button
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#991b1b] bg-transparent px-4 py-3 text-sm font-black text-[#fca5a5] transition hover:bg-[#991b1b] hover:text-white"
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
                        <button
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/35 bg-[#24170d] px-4 py-3 text-sm font-black text-[#f9c66d] transition hover:bg-[#33200f]"
                          onClick={() => shareBookingInvoice(booking)}
                          type="button"
                        >
                          <Share2 size={16} />
                          Share
                        </button>
                        {["waiting", "waitlist"].includes(booking.status) ? (
                          <>
                            <button
                              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/35 bg-transparent px-4 py-3 text-sm font-black text-[#f9c66d] transition hover:bg-[#24170d] disabled:opacity-60"
                              disabled={rescheduleBookingId === booking.id}
                              onClick={() => setRescheduleBooking(booking)}
                              type="button"
                            >
                              <CalendarClock size={16} />
                              Reschedule
                            </button>
                            <button
                              className="min-h-12 rounded-2xl border border-[#f87171]/40 bg-[#2a1111] px-4 py-3 text-sm font-black text-[#fca5a5] transition hover:bg-[#3a1515] disabled:opacity-60"
                              disabled={cancelBookingId === booking.id}
                              onClick={() => setPendingCancelBooking(booking)}
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
                          </>
                        ) : null}
                        {booking.status === "cancelled" &&
                        booking.paymentProvider === "cashfree" &&
                        booking.paymentStatus === "paid" &&
                        !refundInProgress ? (
                          <button
                            className="min-h-12 rounded-2xl border border-[#f9c66d]/35 bg-[#24170d] px-4 py-3 text-sm font-black text-[#f9c66d] transition hover:bg-[#33200f]"
                            onClick={() => {
                              setSelectedBookingGroupKey("");
                              setRefundBooking(booking);
                            }}
                            type="button"
                          >
                            Refund
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {activeBooking ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {[
                          [Clock3, "Live wait", getLiveWaitEstimate(booking)],
                          [CalendarCheck2, "Arrive note", booking.arrivalNote],
                          [Gift, "Loyalty", "+10 pts after completion"]
                        ].map(([Icon, title, text]) => (
                          <div className="rounded-2xl bg-[#2a1111] px-3 py-2 text-xs font-black text-[#991b1b]" key={title}>
                            <p className="flex items-center gap-2 text-[#fca5a5]">
                              <Icon size={14} /> {title}
                            </p>
                            <p className="mt-1 text-[#991b1b]">{text}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <RefundStatusTracker refund={bookingRefund} />
                    {booking.cashfreeFee > 0 ? (
                      <p className="mt-3 rounded-2xl bg-[#24170d] px-3 py-2 text-xs font-black text-[#f9c66d]">
                        Refund eligible amount is {formatMoney(booking.refundableAmount)}.
                        Platform fee {formatMoney(booking.platformFee || 0)}
                        and Cashfree charge {formatMoney(booking.cashfreeFee)} are non-refundable.
                      </p>
                    ) : booking.platformFee > 0 ? (
                      <p className="mt-3 rounded-2xl bg-[#24170d] px-3 py-2 text-xs font-black text-[#f9c66d]">
                        Refund eligible amount is {formatMoney(booking.refundableAmount)}.
                        Platform fee {formatMoney(booking.platformFee)} is non-refundable.
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      {bookingsOnly ? (
      <>
        <RefundRequestDialog
          booking={refundBooking}
          onClose={() => setRefundBooking(null)}
          user={user}
        />
        <CancelReasonDialog
          booking={pendingCancelBooking}
          loading={Boolean(cancelBookingId)}
          onClose={() => setPendingCancelBooking(null)}
          onConfirm={cancelBooking}
        />
        <RescheduleDialog
          booking={rescheduleBooking}
          loading={Boolean(rescheduleBookingId)}
          onClose={() => setRescheduleBooking(null)}
          onConfirm={rescheduleCustomerBooking}
        />
      </>
      ) : null}
    </section>
  );
}

