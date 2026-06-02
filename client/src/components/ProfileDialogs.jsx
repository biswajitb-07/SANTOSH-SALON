import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, X } from "lucide-react";
import { ButtonSpinner, useBodyScrollLock } from "./common.jsx";
import { formatMoney } from "../lib/formatters.js";

const cancelReasons = [
  "I cannot visit today",
  "Booked wrong time",
  "Booked wrong service",
  "Payment or booking issue",
  "Other reason"
];

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

const getRefundStepIndex = (status = "") => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return 2;
  if (["processing", "reviewing"].includes(normalized)) return 1;
  if (normalized) return 0;
  return -1;
};

export function RefundStatusTracker({ refund }) {
  if (!refund) return null;
  const stepIndex = getRefundStepIndex(refund.status);
  const refundStatus = String(refund.status || "").toLowerCase();
  const statusNote =
    ["processing", "reviewing"].includes(refundStatus)
      ? "Refund has been initiated and is waiting for payment provider confirmation."
      : "";
  const visibleAdminNote =
    refundStatus === "completed" ? "" : statusNote || refund.adminRefundNote || "";
  const steps = [
    {
      label: "Requested",
      active:
        "border-[#fb7185] bg-[#991b1b] text-white shadow-[0_0_0_4px_rgba(251,113,133,0.16)]",
      inactive: "border-[#5a2525] bg-[#140909] text-[#fb7185]/55",
      text: "text-[#fb7185]"
    },
    {
      label: "Processing",
      active:
        "border-[#f9c66d] bg-[#7c3f10] text-white shadow-[0_0_0_4px_rgba(249,198,109,0.16)]",
      inactive: "border-[#5c3a18] bg-[#1b1208] text-[#f9c66d]/55",
      text: "text-[#f9c66d]"
    },
    {
      label: "Completed",
      active:
        "border-[#86efac] bg-[#14532d] text-white shadow-[0_0_0_4px_rgba(134,239,172,0.16)]",
      inactive: "border-[#214536] bg-[#07140f] text-[#86efac]/55",
      text: "text-[#86efac]"
    }
  ];

  return (
    <div className="mt-3 rounded-2xl border border-[#35201f] bg-[#101a18] px-4 py-5">
      <div className="relative grid grid-cols-3">
        <span className="absolute left-[16.5%] right-[16.5%] top-4 h-1 rounded-full bg-[#2a1111]" />
        {stepIndex >= 1 ? (
          <span className="absolute left-[16.5%] top-4 h-1 w-[33.5%] rounded-full bg-[#f9c66d] transition-all" />
        ) : null}
        {stepIndex >= 2 ? (
          <span className="absolute left-[50%] top-4 h-1 w-[33.5%] rounded-full bg-[#86efac] transition-all" />
        ) : null}
        {steps.map((step, index) => {
          const active = index <= stepIndex;
          return (
            <div
              className="relative z-[1] flex flex-col items-center gap-2 text-center"
              key={step.label}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-full border-4 text-xs font-black transition ${
                  active ? step.active : step.inactive
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`text-[11px] font-black transition ${
                  active ? step.text : "text-[#637371]"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {visibleAdminNote ? (
        <p className="mt-3 rounded-xl bg-[#24170d] px-3 py-2 text-xs font-bold text-[#f9c66d]">
          Admin note: {visibleAdminNote}
        </p>
      ) : null}
    </div>
  );
}

export function CancelReasonDialog({ booking, loading, onClose, onConfirm }) {
  const [reason, setReason] = useState(cancelReasons[0]);
  const [note, setNote] = useState("");
  useBodyScrollLock(Boolean(booking));

  useEffect(() => {
    setReason(cancelReasons[0]);
    setNote("");
  }, [booking]);

  if (!booking || typeof document === "undefined") return null;

  const willAutoRefund =
    booking.paymentProvider === "cashfree" && booking.paymentStatus === "paid";

  return createPortal(
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/70 px-3 py-3 backdrop-blur-md sm:items-center sm:py-6"
      style={{ zIndex: 2147483000 }}
    >
      <form
        className="queue-shadow max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#f9c66d]/15 bg-[#081311] p-5 text-[#f4fbf8]"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(booking, reason, note);
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-kicker">Cancel Booking</p>
            <h2 className="mt-1 text-2xl font-black">Select a reason</h2>
            {willAutoRefund ? (
              <p className="mt-2 text-sm font-bold leading-6 text-[#9db2ad]">
                Cancellation ke saath refund request automatically submit hogi.
              </p>
            ) : null}
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b1714]"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mt-5 grid gap-2">
          {cancelReasons.map((item) => (
            <label
              className="flex items-center gap-3 rounded-2xl border border-[#35201f] bg-[#0b1714] px-4 py-3 text-sm font-black"
              key={item}
            >
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
          placeholder={willAutoRefund ? "Optional refund/cancel note" : "Optional note"}
          value={note}
        />
        {willAutoRefund ? (
          <div className="mt-4 grid gap-2 rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] p-4 text-sm font-black text-[#f9c66d]">
            <div className="flex flex-wrap justify-between gap-2">
              <span>Total paid</span>
              <span>{formatMoney(booking.amount)}</span>
            </div>
            {booking.platformFee > 0 ? (
              <div className="flex flex-wrap justify-between gap-2">
                <span>Platform fee non-refundable</span>
                <span>{formatMoney(booking.platformFee)}</span>
              </div>
            ) : null}
            {booking.cashfreeFee > 0 ? (
              <div className="flex flex-wrap justify-between gap-2">
                <span>Cashfree charge non-refundable</span>
                <span>{formatMoney(booking.cashfreeFee)}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-between gap-2 border-t border-[#f9c66d]/20 pt-2">
              <span>Refund request</span>
              <span>{formatMoney(booking.refundableAmount)}</span>
            </div>
          </div>
        ) : null}
        <button
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 font-black text-white disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? <ButtonSpinner /> : null}
          {loading
            ? "Cancelling..."
            : willAutoRefund
              ? "Cancel & Request Refund"
              : "Confirm Cancellation"}
        </button>
      </form>
    </div>,
    document.body
  );
}

export function RescheduleDialog({ booking, loading, onClose, onConfirm }) {
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

  if (!booking || typeof document === "undefined") return null;

  const selectedSlot = rescheduleSlots.find(([value]) => value === draft.timeSlot);

  return createPortal(
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/70 px-3 py-3 backdrop-blur-md sm:items-center sm:py-6"
      style={{ zIndex: 2147483000 }}
    >
      <form
        className="queue-shadow max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#f9c66d]/15 bg-[#081311] p-5 text-[#f4fbf8]"
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
          <button
            className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b1714]"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-bold">Booking day</span>
          <select
            className="h-12 w-full rounded-2xl border border-[#35201f] bg-[#0b1714] px-4 outline-none"
            onChange={(event) =>
              setDraft((value) => ({ ...value, bookingDate: event.target.value }))
            }
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
            onChange={(event) =>
              setDraft((value) => ({ ...value, timeSlot: event.target.value }))
            }
            value={draft.timeSlot}
          >
            {rescheduleSlots.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-4 rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] px-4 py-3 text-sm font-bold text-[#f9c66d]">
          Reschedule request updates your booking slot. Admin may adjust it if salon
          capacity changes.
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
    </div>,
    document.body
  );
}
