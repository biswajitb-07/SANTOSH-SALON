import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query as firestoreQuery,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import {
  CalendarCheck2,
  Download,
  Eye,
  LogIn,
  LogOut,
  MessageCircle,
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
import {
  formatBookingStatus,
  formatMoney,
  formatStatus
} from "../lib/formatters.js";
import { downloadBookingInvoice } from "../lib/invoice.js";

const BOOKING_PAGE_SIZE = 4;

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
      : serviceAmount + cashfreeFee
  );

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
    cashfreeFeePercent: Number(data.cashfreeFeePercent || 1.6),
    refundableAmount: Number(data.refundableAmount || serviceAmount),
    nonRefundableFee: Number(data.nonRefundableFee || cashfreeFee),
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
    const firstActive = ["waiting", "waitlist", "in_chair"].includes(first.status)
      ? 0
      : 1;
    const secondActive = ["waiting", "waitlist", "in_chair"].includes(second.status)
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
      return groups;
    }

    groups.push({
      key: groupKey,
      items: [booking],
      totalAmount: Number(booking.amount || 0),
      totalServiceAmount: Number(booking.serviceAmount || 0),
      totalCashfreeFee: Number(booking.cashfreeFee || 0)
    });
    return groups;
  }, []);

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
        nonRefundableFee: Number(booking.nonRefundableFee || booking.cashfreeFee || 0),
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
      toast.error(error.message || "Refund request could not be sent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/65 px-3 py-3 backdrop-blur-md sm:px-4 sm:py-6">
      <form
        className="queue-shadow max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-[#f9c66d]/15 bg-[#081311]/95 p-5 text-[#f4fbf8] sm:max-h-[90vh] sm:max-w-2xl sm:p-6"
        onSubmit={submitRefund}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-kicker">
              Refund Request
            </p>
            <h2 className="mt-1 text-3xl font-black">{booking.service}</h2>
            <p className="mt-2 text-sm font-bold text-[#9db2ad]">
              {booking.name} • Token {booking.token} • Refund{" "}
              {formatMoney(booking.refundableAmount)}
            </p>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-2xl border border-[#35201f] bg-[#0b1714] text-[#f4fbf8] transition hover:border-[#f9c66d]/35"
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

        <p className="mt-4 rounded-2xl border border-[#f87171]/20 bg-[#3a1515] px-4 py-3 text-sm font-bold text-[#fee2e2]">
          This is a partial refund for this one booking only. Other people in
          the same Cashfree payment stay active. Refunds usually complete in
          5-7 business days.
        </p>
        {booking.cashfreeFee > 0 ? (
          <div className="mt-3 grid gap-2 rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] p-4 text-sm font-black text-[#f9c66d]">
            <div className="flex justify-between gap-3">
              <span>Total paid</span>
              <span>{formatMoney(booking.amount)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Cashfree charge not refundable</span>
              <span>{formatMoney(booking.cashfreeFee)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-[#f9c66d]/20 pt-2">
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
  const [bookingPage, setBookingPage] = useState(1);
  const [selectedBookingGroupKey, setSelectedBookingGroupKey] = useState("");
  const groupedBookings = groupUserBookings(bookings);

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
      where("userId", "==", user.uid)
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
  }, [user, bookingsOnly]);

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

  const getBookingViewState = (booking) => {
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
                  ["waiting", "waitlist", "in_chair"].includes(booking.status)
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
                        {group.totalCashfreeFee > 0 ? (
                          <span className="rounded-full bg-[#fff7ed] px-3 py-2 text-[#c2410c]">
                            Cashfree charge {formatMoney(group.totalCashfreeFee)}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-[#2a1111] px-3 py-2 text-[#991b1b]">
                          {statusLabels.join(", ")}
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
        <div className="modal-fade fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 px-3 py-3 backdrop-blur-md sm:items-center sm:px-4 sm:py-6">
          <div className="queue-shadow max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#f9c66d]/15 bg-[#081311]/95 text-[#f4fbf8] sm:max-h-[90vh] sm:max-w-2xl sm:rounded-[2rem]">
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
                        ["Service Amount", formatMoney(booking.serviceAmount)],
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

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#35201f] pt-3">
                      <p className="max-w-xl text-sm font-bold text-[#637371]">
                        {helperText}
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
                        {["waiting", "waitlist"].includes(booking.status) ? (
                          <button
                            className="min-h-12 rounded-2xl border border-[#f87171]/40 bg-[#2a1111] px-4 py-3 text-sm font-black text-[#fca5a5] transition hover:bg-[#3a1515] disabled:opacity-60"
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
                      <p className="mt-3 rounded-2xl bg-[#2a1111] px-3 py-2 text-xs font-black text-[#991b1b]">
                        {booking.arrivalNote}
                      </p>
                    ) : null}
                    {booking.cashfreeFee > 0 ? (
                      <p className="mt-3 rounded-2xl bg-[#fff7ed] px-3 py-2 text-xs font-black text-[#c2410c]">
                        Refund eligible amount is {formatMoney(booking.refundableAmount)}.
                        Cashfree charge {formatMoney(booking.cashfreeFee)} is
                        non-refundable.
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
      <RefundRequestDialog
        booking={refundBooking}
        onClose={() => setRefundBooking(null)}
        user={user}
      />
      ) : null}
    </section>
  );
}
