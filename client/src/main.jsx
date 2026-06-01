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
  query as firestoreQuery,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import {
  ArrowRight,
  Phone,
  X
} from "lucide-react";
import { auth, db, googleProvider } from "./lib/firebase.js";
import {
  useCreateCustomerPaymentOrderMutation,
  useVerifyCustomerPaymentMutation
} from "./store/api/customerPaymentsApi.js";
import {
  ButtonSpinner,
  ConfirmDialog,
  getUserPhotoUrl,
  useBodyScrollLock,
  useDragScroll
} from "./components/common.jsx";
import {
  Header,
  PageSkeleton,
  ScrollPercentBadge
} from "./components/layout.jsx";
import {
  formatMoney
} from "./lib/formatters.js";
import {
  businessPages,
  getClientRoute,
  legalPages,
  titleCase,
  writeClientRoute
} from "./lib/routing.js";
import { applyClientSeo } from "./lib/seo.js";
import { useRevealOnScroll } from "./lib/animations.js";
import { defaultServices, getServiceImageUrl } from "./lib/services.js";
import { BookingPage, HomePage } from "./pages/bookingPages.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import {
  AboutPage,
  ContactPage,
  FaqPage,
  GalleryPage,
  LegalPage,
  PricingPage,
  StaffPage
} from "./pages/staticPages.jsx";
import { store } from "./store/store.js";
import "./styles.css";

const SALON_SLUG = import.meta.env.VITE_SALON_SLUG || "santosh";
const BOOKING_CLOSED_MESSAGE =
  "Booking is currently closed by the owner. Please try again later.";
const STAFF_COUNT = 3;
const DAILY_CONFIRMED_LIMIT = 35;
const WAITLIST_LIMIT = 10;
const ONLINE_BOOKING_START_HOUR = 6;
const SLOT_START_HOUR = 7;
const BOOKING_END_HOUR = 23;
const LUNCH_START_HOUR = 13;
const LUNCH_END_HOUR = 14;
const SLOT_MINUTES = 30;
const activeBookingStatuses = new Set(["waiting", "in_chair", "waitlist"]);
const confirmedBookingStatuses = new Set(["waiting", "in_chair"]);

const getTimestampMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value.toMillis) return value.toMillis();
  if (value.toDate) return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const getBookingSortMinutes = (booking) => {
  const status = String(booking.status || "").toLowerCase();
  if (status === "waitlist") return Number.MAX_SAFE_INTEGER - 1;
  const minutes = minutesFromSlot(booking.timeSlot || "");
  return Number.isFinite(minutes) ? minutes : Number.MAX_SAFE_INTEGER - 2;
};

const sortBookingsForTurns = (bookings) =>
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

    return String(first.id || "").localeCompare(String(second.id || ""));
  });

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

  for (let hour = SLOT_START_HOUR; hour < BOOKING_END_HOUR; hour += 1) {
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
    null,
    ONLINE_BOOKING_START_HOUR
  )} to ${formatTimeValue(
    gate.closingTime,
    BOOKING_END_HOUR
  )}. First haircut slot starts at ${formatTimeValue(null, SLOT_START_HOUR)}. Lunch/rest break is 1 PM to 2 PM.`;

const isCustomerBookingWindowOpen = (gate = {}) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openingMinutes = ONLINE_BOOKING_START_HOUR * 60;
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

const getRequestErrorMessage = (error, fallback) =>
  error?.data?.error ||
  error?.error ||
  error?.message ||
  error?.details?.error?.description ||
  fallback;

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

const reindexQueueDate = async (bookingDate) => {
  if (!bookingDate) return [];

  const queueSnapshot = await getDocs(
    firestoreQuery(
      collection(db, "customers"),
      where("bookingDate", "==", bookingDate)
    )
  );
  const activeBookings = sortBookingsForTurns(
    queueSnapshot.docs
      .map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ref: snapshotDoc.ref,
        ...snapshotDoc.data()
      }))
      .filter((booking) =>
        activeBookingStatuses.has(String(booking.status || "").toLowerCase())
      )
  );

  await Promise.all(
    activeBookings.map((booking, index) =>
      updateDoc(booking.ref, {
        token: index + 1,
        peopleAhead: index,
        turnSortMinutes: getBookingSortMinutes(booking)
      })
    )
  );

  return activeBookings.map((booking, index) => ({
    ...booking,
    token: index + 1,
    peopleAhead: index
  }));
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
  const slotDragScroll = useDragScroll({ enabled: true });

  useBodyScrollLock(Boolean(service));

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
        toast.info(
          `Payment pending. Complete Cashfree checkout for ${formatMoney(
            order.charge?.payableAmount
          )}.`
        );

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

        toast.info("Payment received. Verifying booking confirmation...");
        const verification = await verifyCustomerPayment(order.order_id).unwrap();
        if (!verification.verified) {
          throw new Error(verification.error || "Payment verification failed");
        }
        toast.success("Payment verified successfully.");

        paidOrder = verification.order || {};
        paidPayment = verification.payment || {};
        charge = order.charge || onlineChargePreview;
      }

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
      const createdSortBase = Date.now();
      const perCustomerCashfreeFee =
        customers.length && form.paymentMethod === "online"
          ? Math.round((Number(charge.cashfreeFee || 0) / customers.length) * 100) /
            100
          : 0;
      const perCustomerPayable =
        form.paymentMethod === "online"
          ? Math.round((Number(service.amount || 0) + perCustomerCashfreeFee) * 100) /
            100
          : Number(service.amount || 0);

      for (const [index, customer] of customers.entries()) {
        const bookingRef = await addDoc(collection(db, "customers"), {
          name: customer.name,
          mobile: customer.mobile,
          service: service.title,
          amount: service.amount,
          serviceAmount: service.amount,
          payableAmount: perCustomerPayable,
          refundableAmount: service.amount,
          groupServiceAmount: charge.serviceAmount,
          groupPayableAmount: charge.payableAmount,
          cashfreeFeePercent: charge.cashfreeFeePercent ?? 1.6,
          cashfreeFee: perCustomerCashfreeFee,
          groupCashfreeFee: charge.cashfreeFee,
          nonRefundableFee: perCustomerCashfreeFee,
          token: 0,
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
          peopleAhead: 0,
          userId: user.uid,
          customerType: customer.customerType,
          bookingGroupId,
          bookingGroupSize: customers.length,
          bookingGroupIndex: index + 1,
          arrivalNote:
            "Please reach the salon 40 minutes before your turn for a quicker haircut. Cancel your booking if you cannot visit.",
          source: "service-payment",
          createdSort: createdSortBase + index,
          createdAt: serverTimestamp()
        });
        bookingRefs.push(bookingRef);
      }

      const orderedBookings = await reindexQueueDate(bookingOption.date);
      const bookedTurns = bookingRefs
        .map((bookingRef) =>
          orderedBookings.find((booking) => booking.id === bookingRef.id)?.token
        )
        .filter(Boolean);
      const firstTurn = bookedTurns[0] || "-";
      const lastTurn = bookedTurns[bookedTurns.length - 1] || firstTurn;

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
            ? "Pay at salon booking confirmed"
            : "Cashfree payment verified"
        }. Turn ${firstTurn}${
          bookedTurns.length > 1 ? `-${lastTurn}` : ""
        } ${
          isWaitlist ? "added to the waiting list" : "confirmed"
        } for ${bookingOption.label}, ${bookingOption.displayDate}.`
      });
      if (form.paymentMethod === "cod") {
        toast.info("Cash payment is pending. Please pay at the salon.");
      }
      toast.success(
        `Booking ${
          isWaitlist ? "added to waiting list" : "confirmed"
        }. Turn ${firstTurn}${bookedTurns.length > 1 ? `-${lastTurn}` : ""} for ${
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
      toast.error(
        form.paymentMethod === "online"
          ? `${message}. If money was debited, please wait for provider/bank auto-reversal or contact the salon with your payment/order ID.`
          : message
      );
      setLoading(false);
    }
  };

  return (
    <div className="modal-fade fixed inset-0 z-[9999] flex h-[100dvh] items-center justify-center overflow-hidden bg-black/65 px-3 py-4 backdrop-blur-md sm:px-5 sm:py-6">
      <section className="queue-shadow flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#f9c66d]/15 bg-[#081311]/95 text-[#f4fbf8] sm:max-h-[min(820px,calc(100dvh-3rem))] sm:max-w-3xl sm:rounded-[2rem] lg:max-w-4xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#35201f] bg-[#081311]/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="section-kicker">
              Checkout Details
            </p>
            <h2 className="mt-1 text-3xl font-black">{service.title}</h2>
            <p className="mt-2 text-[#9db2ad]">
              {service.time} • {service.price}
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

        <form className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 sm:p-6" onSubmit={submitCheckout}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Name</span>
            <input
              className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] px-4 text-[#f4fbf8] outline-none transition focus:border-[#f87171] focus:ring-4 focus:ring-[#ef4444]/20"
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
                className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] pl-11 pr-4 text-[#f4fbf8] outline-none transition focus:border-[#f87171] focus:ring-4 focus:ring-[#ef4444]/20"
                onChange={(event) =>
                  setForm((value) => ({ ...value, mobile: event.target.value }))
                }
                placeholder="98765 43210"
                value={form.mobile}
              />
            </div>
          </label>
          <div className="rounded-2xl border border-[#35201f] bg-[#0b1714] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#f4fbf8]">
                  Book for one more person
                </p>
                <p className="mt-1 text-xs font-bold text-[#9db2ad]">
                  One checkout can create up to 2 tokens: you and one guest.
                  Guest login or registration is not required.
                </p>
              </div>
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                  form.includeGuest
                    ? "bg-[#2a1111] text-[#fca5a5]"
                    : "bg-[#991b1b] text-white"
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
                    className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#101a18] px-4 text-[#f4fbf8] outline-none transition focus:border-[#f87171] focus:ring-4 focus:ring-[#ef4444]/20"
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
                      className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#101a18] pl-11 pr-4 text-[#f4fbf8] outline-none transition focus:border-[#f87171] focus:ring-4 focus:ring-[#ef4444]/20"
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
                        ? "border-[#f87171] bg-[#3a1515] text-[#f4fbf8] ring-4 ring-[#ef4444]/20"
                        : "border-[#4a2525] bg-[#0b1714] text-[#9db2ad] hover:border-[#f87171]"
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
            <div
              className="services-slider drag-scroll -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3"
              {...slotDragScroll}
            >
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
                    className={`min-h-20 min-w-[80px] snap-start rounded-2xl border px-4 py-3 text-center transition sm:min-w-[42%] lg:min-w-[34%] ${
                        active
                          ? "border-[#f87171] bg-[#3a1515] text-[#f4fbf8] ring-4 ring-[#ef4444]/20"
                          : "border-[#4a2525] bg-[#0b1714] text-[#9db2ad] hover:border-[#f87171]"
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
                <div className="min-w-full rounded-2xl border border-[#f9c66d]/25 bg-[#24170d] px-4 py-3 text-sm font-black text-[#f9c66d]">
                  No future slots are available for today. Please contact the
                  salon.
                </div>
              )}
            </div>
            <p className="mt-2 text-xs font-bold text-[#9db2ad]">
              Lunch/rest break is 1 PM to 2 PM, so that slot is hidden.{" "}
              {getBookingWindowMessage(bookingGate)}
            </p>
          </div>
          <div>
            <span className="mb-2 block text-sm font-bold">Payment Method</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["online", "Online Payment", "Cashfree secure checkout"],
                ["cod", "Pay at Salon", "Pay after your haircut"]
              ].map(([method, label, helper]) => {
                const active = form.paymentMethod === method;

                return (
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[#f87171] bg-[#3a1515] text-[#f4fbf8] ring-4 ring-[#ef4444]/20"
                        : "border-[#4a2525] bg-[#0b1714] text-[#9db2ad] hover:border-[#f87171]"
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
          <div className="rounded-2xl border border-[#35201f] bg-[#0b1714] p-4">
            <p className="text-sm font-bold text-[#9db2ad]">Selected Service</p>
            <div className="mt-2 flex items-center justify-between gap-3 border-b border-[#35201f] pb-3">
              <p className="font-black">
                {service.title}
                {peopleCount > 1 ? ` x ${peopleCount}` : ""}
              </p>
              <p className="font-black text-[#f9c66d]">
                {formatMoney(chargePreview.serviceAmount)}
              </p>
            </div>
            <div className="mt-3 grid gap-2 text-sm font-bold text-[#f4fbf8]">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#101a18] px-3 py-2">
                <span>{form.name.trim() || "You"}</span>
                <span>Self</span>
              </div>
              {form.includeGuest ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[#101a18] px-3 py-2">
                  <span>{form.guestName.trim() || "Guest"}</span>
                  <span>Guest</span>
                </div>
              ) : null}
            </div>
            <div className="mt-3 space-y-2 text-sm font-bold text-[#9db2ad]">
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
              <div className="flex items-center justify-between gap-3 border-t border-[#35201f] pt-2 text-base text-[#f4fbf8]">
                <span>Total payable</span>
                <span>{formatMoney(chargePreview.payableAmount)}</span>
              </div>
            </div>
          </div>
          <button
            className="shine-button flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 py-4 font-black text-white shadow-lg shadow-[#991b1b]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
                  ? "Confirm Pay at Salon Booking"
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
                ? "bg-[#2a1111] text-[#fca5a5]"
                : status.type === "info"
                  ? "bg-[#24170d] text-[#f9c66d]"
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
  const [bookingGate, setBookingGate] = useState({
    loading: true,
    open: false,
    message: "Checking salon booking status...",
    openingTime: "07:00",
    closingTime: "23:00",
    manualShopClosed: false,
    premiumActive: false
  });

  useRevealOnScroll(page);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setLoginLoading(false);
      setLogoutLoading(false);

    });
  }, []);

  useEffect(() => {
    writeClientRoute({ page }, true);

    const syncRoute = () => {
      const nextRoute = getClientRoute();
      setPage(nextRoute.page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    applyClientSeo(page);
  }, [page]);

  useEffect(() => {
    if (!["home", "booking"].includes(page)) {
      setQueueLoading(false);
      return undefined;
    }

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
        const activeBookings = sortBookingsForTurns(
          todayBookings.filter((booking) =>
            activeBookingStatuses.has(String(booking.status || "").toLowerCase())
          )
        );
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
  }, [page]);

  useEffect(() => {
    if (!["home", "booking"].includes(page)) {
      return undefined;
    }

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
  }, [page]);

  useEffect(() => {
    if (!["home", "booking"].includes(page)) {
      return undefined;
    }

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
  }, [page]);

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

  const navigatePage = (nextPage) => {
    setRouteProgressActive(true);
    setScrollBadgeVisible(true);
    setRouteProgress(18);
    setPage(nextPage);
    writeClientRoute({ page: nextPage });
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
      toast.success("Login successful.");
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
      toast.success("Logout successful.");
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
    navigatePage("my-bookings");
  };

  if (authLoading) {
    return <PageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[#06100e] text-[#f4fbf8]">
      <Toaster
        position="top-right"
        className="app-toaster"
        offset="76px"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: "18px",
            border: "1px solid #35201f",
            boxShadow: "0 18px 60px rgba(0, 0, 0, 0.28)",
            zIndex: 100000
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
      {page === "contact" ? <ContactPage user={user} /> : null}
      {page === "pricing" ? <PricingPage /> : null}
      {page === "gallery" ? <GalleryPage /> : null}
      {page === "staff" ? <StaffPage /> : null}
      {page === "faq" ? <FaqPage /> : null}
      {legalPages.includes(page) ? <LegalPage page={page} /> : null}
      {page === "profile" ? (
        <ProfilePage
          loginLoading={loginLoading}
          logoutLoading={logoutLoading}
          onMyBookings={() => navigatePage("my-bookings")}
          onLogin={login}
          onLogout={requestLogout}
          user={user}
        />
      ) : null}
      {page === "my-bookings" ? (
        <ProfilePage
          bookingsOnly
          loginLoading={loginLoading}
          logoutLoading={logoutLoading}
          onLogin={login}
          onLogout={requestLogout}
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
      <footer className="mt-10 border-t border-[#5a2525]/60 bg-[#050d0b] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 rounded-[2rem] border border-[#5a2525]/60 bg-[#0b1714]/90 p-5 shadow-2xl shadow-black/30 sm:p-6 lg:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#a5161a] text-lg font-black text-white">
                  S
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffb4b4]">
                    Santosh
                  </p>
                  <p className="text-lg font-black text-white">Salon Queue</p>
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm font-bold leading-7 text-[#a9bfba]">
                Book grooming services, track your token live, and reach the salon
                at the right time.
              </p>
              <div className="mt-4 inline-flex rounded-full border border-[#f9c66d]/20 bg-[#24170d] px-4 py-2 text-sm font-black text-[#ffcc70]">
                Open daily, 7 AM - 11 PM
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb4b4]">
                Explore
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[...businessPages, "contact"].map((item) => (
                  <button
                    className="rounded-2xl border border-[#35201f] bg-[#101a18] px-3 py-2 text-left text-sm font-black text-white transition hover:border-[#f9c66d]/40 hover:bg-[#24170d]"
                    key={item}
                    onClick={() => navigatePage(item)}
                    type="button"
                  >
                    {titleCase(item)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb4b4]">
                Legal
              </p>
              <div className="mt-4 grid gap-2">
                {legalPages.map((item) => (
                  <button
                    className="rounded-2xl border border-[#35201f] bg-[#101a18] px-3 py-2 text-left text-sm font-black text-white transition hover:border-[#f9c66d]/40 hover:bg-[#24170d]"
                    key={item}
                    onClick={() => navigatePage(item)}
                    type="button"
                  >
                    {titleCase(item)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 px-2 pt-5 text-xs font-bold text-[#6f8580] sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Santosh Salon Queue. All rights reserved.</p>
            <p>Secure Google login, Cashfree payments, and live queue updates.</p>
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

