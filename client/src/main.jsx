import React, { Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Toaster, toast } from "sonner";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query as firestoreQuery,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import {
  ArrowRight,
  Phone,
  Tag,
  X
} from "lucide-react";
import { auth, db, googleProvider } from "./lib/firebase.js";
import { getSafeErrorMessage } from "./lib/errors.js";
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
  serviceSeoPages,
  titleCase,
  writeClientRoute
} from "./lib/routing.js";
import { applyClientSeo } from "./lib/seo.js";
import { useRevealOnScroll } from "./lib/animations.js";
import { defaultServices, getServiceImageUrl } from "./lib/services.js";
import { BarbersPage, BookingPage, HomePage } from "./pages/bookingPages.jsx";
import { store } from "./store/store.js";
import "./styles.css";

const lazyPage = (loader, exportName) =>
  React.lazy(() =>
    loader().then((module) => ({
      default: module[exportName]
    }))
  );

const ProfilePage = lazyPage(() => import("./pages/ProfilePage.jsx"), "ProfilePage");
const AboutPage = lazyPage(() => import("./pages/staticPages.jsx"), "AboutPage");
const ContactPage = lazyPage(() => import("./pages/staticPages.jsx"), "ContactPage");
const FaqPage = lazyPage(() => import("./pages/staticPages.jsx"), "FaqPage");
const GalleryPage = lazyPage(() => import("./pages/staticPages.jsx"), "GalleryPage");
const LegalPage = lazyPage(() => import("./pages/staticPages.jsx"), "LegalPage");
const PricingPage = lazyPage(() => import("./pages/staticPages.jsx"), "PricingPage");
const ServiceSeoPage = lazyPage(() => import("./pages/staticPages.jsx"), "ServiceSeoPage");
const StaffPage = lazyPage(() => import("./pages/staticPages.jsx"), "StaffPage");

const SALON_SLUG = import.meta.env.VITE_SALON_SLUG || "santosh";
const BOOKING_CLOSED_MESSAGE =
  "Booking is currently closed by the owner. Please try again later.";
const STAFF_COUNT = 3;
const DAILY_CONFIRMED_LIMIT = 35;
const WAITLIST_LIMIT = 10;
const USER_BOOKING_HISTORY_LIMIT = 5;
const PLATFORM_FEE_PER_PERSON = 2;
const BARBER_OPTIONS = [
  "Next available barber",
  "Santosh",
  "Haircut specialist",
  "Beard stylist"
];
const DEFAULT_BARBER_NAMES = ["Santosh", "Haircut specialist", "Beard stylist"];
const DEFAULT_BARBER_PLACEHOLDERS = [
  "/assets/owner-santosh-portrait.png",
  "https://images.pexels.com/photos/2061820/pexels-photo-2061820.jpeg?auto=compress&cs=tinysrgb&w=900",
  "https://images.pexels.com/photos/2881253/pexels-photo-2881253.jpeg?auto=compress&cs=tinysrgb&w=900"
];
const getSafeBarberImageUrl = (imageUrl) => {
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
const DEFAULT_COUPONS = {
  WELCOME10: { label: "Welcome offer", percent: 10 },
  SALON20: { label: "Salon special", type: "amount", amount: 20 }
};
const ONLINE_BOOKING_START_HOUR = 6;
const SLOT_START_HOUR = 7;
const BOOKING_END_HOUR = 23;
const LUNCH_START_HOUR = 13;
const LUNCH_END_HOUR = 14;
const SLOT_MINUTES = 30;
const activeBookingStatuses = new Set(["confirmed", "waiting", "in_chair", "waitlist"]);
const confirmedBookingStatuses = new Set(["confirmed", "waiting", "in_chair"]);

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

    const firstPosition = Number(first.queuePosition || 0);
    const secondPosition = Number(second.queuePosition || 0);
    if (firstPosition || secondPosition) {
      if (!firstPosition) return 1;
      if (!secondPosition) return -1;
      if (firstPosition !== secondPosition) return firstPosition - secondPosition;
    }

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

const parseTimeToMinutes = (timeValue, fallbackHour) => {
  const [hour = fallbackHour, minute = 0] = String(timeValue || "")
    .split(":")
    .map((value) => Number(value));
  const safeHour = Number.isFinite(hour) ? hour : fallbackHour;
  const safeMinute = Number.isFinite(minute) ? minute : 0;
  return safeHour * 60 + safeMinute;
};

const createTimeSlots = (openingTime = "07:00", closingTime = "23:00") => {
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

const timeSlots = createTimeSlots();

const minutesFromSlot = (slotValue = "") => {
  const [hour = "0", minute = "0"] = slotValue.split(":");
  return Number(hour) * 60 + Number(minute);
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
  )}. First haircut slot starts at ${formatTimeValue(
    gate.openingTime,
    SLOT_START_HOUR
  )}. Lunch/rest break is 1 PM to 2 PM.`;

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
  getSafeErrorMessage(
    error?.data?.error ||
      error?.error ||
      error?.message ||
      error?.details?.error?.description,
    fallback
  );

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

const getCouponDiscount = (code, amount, peopleCount = 1, coupons = DEFAULT_COUPONS) => {
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

const normalizeBarberAvailability = (salon = {}, dateValue = toDateInputValue(new Date())) =>
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
          : "") || DEFAULT_BARBER_PLACEHOLDERS[index % DEFAULT_BARBER_PLACEHOLDERS.length],
      imagePublicId:
        Array.isArray(salon.barbers)
          ? salon.barbers.find((barber) => barber?.name === name)?.imagePublicId || ""
          : "",
      unavailableDates
    };
  });

const getSalonBarberNames = (salon = {}) => {
  const names = Array.isArray(salon.barbers)
    ? salon.barbers
        .filter((barber) => barber?.active !== false && barber?.name)
        .map((barber) => barber.name.trim())
        .filter(Boolean)
    : [];
  return names.length ? [...new Set(names)] : DEFAULT_BARBER_NAMES;
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
        queuePosition: index + 1,
        turnSortMinutes: getBookingSortMinutes(booking)
      })
    )
  );

  return activeBookings.map((booking, index) => ({
    ...booking,
    token: index + 1,
    peopleAhead: index,
    queuePosition: index + 1
  }));
};

const getBookingDayStats = async (bookingDate, slots = timeSlots) => {
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
    availableSlots: slots.filter(
      (slot) => (slotCounts[slot.value] || 0) < STAFF_COUNT
    ),
    slotCounts
  };
};

const getActiveUserBookings = async (userId) => {
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

const pruneUserBookingHistory = async (userId) => {
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

function CheckoutModal({
  bookingGate,
  service,
  user,
  userAccount,
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
    preferredBarber: BARBER_OPTIONS[0],
    couponCode: "",
    includeGuest: false,
    guestName: "",
    guestMobile: ""
  });
  const [status, setStatus] = useState(null);
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotState, setSlotState] = useState({
    loading: true,
    availableSlots: [],
    confirmedCount: 0,
    waitlistCount: 0
  });
  const slotDragScroll = useDragScroll({ enabled: true });
  const bookingTimeSlots = createTimeSlots(
    bookingGate.openingTime,
    bookingGate.closingTime
  );

  useBodyScrollLock(Boolean(service));

  useEffect(() => {
    setForm({
      name: user?.displayName || user?.email?.split("@")[0] || "",
      mobile: "",
      bookingDay: "today",
      timeSlot: "",
      preferredBarber: BARBER_OPTIONS[0],
      couponCode: "",
      includeGuest: false,
      guestName: "",
      guestMobile: ""
    });
    setStatus(null);
    setAppliedCouponCode("");
  }, [service, user]);

  useEffect(() => {
    if (!service) return undefined;

    let cancelled = false;
    const bookingOption = getBookingOption(form.bookingDay);
    setSlotState((current) => ({ ...current, loading: true }));

    getBookingDayStats(bookingOption.date, bookingTimeSlots)
      .then((stats) => {
        if (cancelled) return;
        const requiredSeats = form.includeGuest ? 2 : 1;
        const visibleSlots = getVisibleTimeSlots(form.bookingDay, bookingTimeSlots).filter(
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
  }, [bookingGate.closingTime, bookingGate.openingTime, form.bookingDay, form.includeGuest, service]);

  useEffect(() => {
    if (!service || form.preferredBarber === BARBER_OPTIONS[0]) return;
    const available = (bookingGate.barbers || normalizeBarberAvailability())
      .filter((barber) => barber.available)
      .map((barber) => barber.name);
    if (!available.includes(form.preferredBarber)) {
      setForm((value) => ({ ...value, preferredBarber: BARBER_OPTIONS[0] }));
    }
  }, [bookingGate.barbers, form.preferredBarber, service]);

  if (!service) return null;

  const guestMobile = form.guestMobile.replace(/\D/g, "");
  const peopleCount = form.includeGuest ? 2 : 1;
  const bookingOptionForBarber = getBookingOption(form.bookingDay);
  const availableBarbers = (bookingGate.barbers || normalizeBarberAvailability())
    .filter((barber) => barber.available)
    .map((barber) => barber.name);
  const barberChoices = [BARBER_OPTIONS[0], ...availableBarbers];
  const salonCoupons = bookingGate.coupons || DEFAULT_COUPONS;
  const couponCode = appliedCouponCode;
  const typedCouponCode = form.couponCode.trim().toUpperCase();
  const discountAmount = getCouponDiscount(
    appliedCouponCode,
    service.amount,
    peopleCount,
    salonCoupons
  );
  const platformFeeTotal = PLATFORM_FEE_PER_PERSON * peopleCount;
  const discountedServiceAmount = Math.max(
    0,
    Math.round((Number(service.amount || 0) * peopleCount - discountAmount) * 100) / 100
  );
  const perPersonServiceAmount =
    Math.round((discountedServiceAmount / peopleCount) * 100) / 100;
  const onlineChargePreview = getCashfreeChargePreview(
    perPersonServiceAmount + PLATFORM_FEE_PER_PERSON,
    peopleCount
  );
  const chargePreview = onlineChargePreview;

  const selectedBarberAvailable =
    form.preferredBarber === BARBER_OPTIONS[0] ||
    availableBarbers.includes(form.preferredBarber);

  const applyCoupon = () => {
    if (!typedCouponCode) {
      setAppliedCouponCode("");
      toast.info("Enter a coupon code first.");
      return;
    }

    const nextDiscount = getCouponDiscount(
      typedCouponCode,
      service.amount,
      peopleCount,
      salonCoupons
    );
    if (!nextDiscount) {
      const coupon = salonCoupons[typedCouponCode];
      setAppliedCouponCode("");
      toast.error(
        coupon
          ? "Coupon is not applicable for this booking amount."
          : "Coupon is not available."
      );
      return;
    }

    setAppliedCouponCode(typedCouponCode);
    toast.success(`${typedCouponCode} applied.`);
  };

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
    const selectedSlot = bookingTimeSlots.find((slot) => slot.value === form.timeSlot);

    if (!selectedBarberAvailable || !availableBarbers.length) {
      const message =
        "Selected barber is unavailable for this booking day. Please choose an available barber.";
      setStatus({
        type: "error",
        message
      });
      toast.error(message);
      return;
    }

    if (!isCustomerBookingWindowOpen(bookingGate)) {
      const message = getBookingWindowMessage(bookingGate);
      setStatus({
        type: "error",
        message
      });
      toast.error(message);
      return;
    }

    if (userAccount?.blocked) {
      const message =
        "Your booking access is blocked by the salon. Please contact the salon team.";
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

      const prePaymentStats = await getBookingDayStats(bookingOption.date, bookingTimeSlots);
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

      const dayStats = await getBookingDayStats(bookingOption.date, bookingTimeSlots);
      const bookingGroupId = `grp_${Date.now()}_${user.uid.slice(0, 8)}`;
      let bookingRefs = [];
      let bookedTurns = [];
      const createdSortBase = Date.now();
      const perCustomerCashfreeFee =
        customers.length
          ? Math.round((Number(charge.cashfreeFee || 0) / customers.length) * 100) /
            100
          : 0;
      const perCustomerPayable =
        Math.round((Number(perPersonServiceAmount || 0) + PLATFORM_FEE_PER_PERSON + perCustomerCashfreeFee) * 100) /
        100;

      await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, "bookingCounters", bookingOption.date);
        const counterSnapshot = await transaction.get(counterRef);
        const counter = counterSnapshot.exists() ? counterSnapshot.data() : {};
        const confirmedCount = counterSnapshot.exists()
          ? Number(counter.confirmedCount || 0)
          : Number(dayStats.confirmedCount || 0);
        const waitlistCount = counterSnapshot.exists()
          ? Number(counter.waitlistCount || 0)
          : Number(dayStats.waitlistCount || 0);
        const slotCounts = counterSnapshot.exists()
          ? { ...(counter.slotCounts || {}) }
          : { ...(dayStats.slotCounts || {}) };
        const selectedSlotValue = selectedSlot?.value || "";
        const slotCount = selectedSlotValue
          ? Number(slotCounts[selectedSlotValue] || 0)
          : 0;
        const slotOverCapacity =
          selectedSlotValue && slotCount + customers.length > STAFF_COUNT;
        const isWaitlist =
          confirmedCount + customers.length > DAILY_CONFIRMED_LIMIT ||
          slotOverCapacity;

        if (isWaitlist && waitlistCount + customers.length > WAITLIST_LIMIT) {
          throw new Error(
            "The waiting list already has 10 customers. Booking will reopen when the waiting list drops to 9."
          );
        }

        bookingRefs = customers.map(() => doc(collection(db, "customers")));
        bookedTurns = isWaitlist
          ? []
          : customers.map((_, index) => confirmedCount + index + 1);

        customers.forEach((customer, index) => {
          const token = isWaitlist ? 0 : confirmedCount + index + 1;
          transaction.set(bookingRefs[index], {
            name: customer.name,
            mobile: customer.mobile,
            service: service.title,
            amount: perPersonServiceAmount,
            serviceAmount: perPersonServiceAmount,
            originalServiceAmount: service.amount,
            couponCode,
            discountAmount:
              Math.round((Number(discountAmount || 0) / customers.length) * 100) /
              100,
            platformFee: PLATFORM_FEE_PER_PERSON,
            groupPlatformFee: platformFeeTotal,
            payableAmount: perCustomerPayable,
            refundableAmount: perPersonServiceAmount,
            groupServiceAmount: discountedServiceAmount,
            groupPayableAmount: charge.payableAmount,
            cashfreeFeePercent: charge.cashfreeFeePercent ?? 1.6,
            cashfreeFee: perCustomerCashfreeFee,
            groupCashfreeFee: charge.cashfreeFee,
            nonRefundableFee: perCustomerCashfreeFee + PLATFORM_FEE_PER_PERSON,
            token,
            status: isWaitlist ? "waitlist" : "waiting",
            paymentStatus: "paid",
            paymentProvider: "cashfree",
            bookingDay: bookingOption.day,
            bookingDate: bookingOption.date,
            bookingLabel: bookingOption.label,
            bookingDisplayDate: bookingOption.displayDate,
            timeSlot: isWaitlist ? "" : selectedSlotValue,
            timeSlotLabel: isWaitlist
              ? "Waiting list"
              : selectedSlot?.label || "Waiting list",
            barberName: form.preferredBarber,
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
              paidPayment.payment_status ||
              paidOrder.order_status ||
              "PAID",
            peopleAhead: isWaitlist ? 0 : token - 1,
            queuePosition: isWaitlist ? 0 : token,
            turnSortMinutes: getBookingSortMinutes({
              bookingDate: bookingOption.date,
              timeSlot: selectedSlotValue,
              createdSort: createdSortBase + index
            }),
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
        });

        if (!isWaitlist && selectedSlotValue) {
          slotCounts[selectedSlotValue] = slotCount + customers.length;
        }

        transaction.set(
          counterRef,
          {
            bookingDate: bookingOption.date,
            confirmedCount: isWaitlist
              ? confirmedCount
              : confirmedCount + customers.length,
            waitlistCount: isWaitlist
              ? waitlistCount + customers.length
              : waitlistCount,
            slotCounts,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      });
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
      try {
        await pruneUserBookingHistory(user.uid);
      } catch {
        toast.info("Booking saved. Old history cleanup will retry on your next booking.");
      }

      setStatus({
        type: "success",
        message: `Cashfree payment verified. Turn ${firstTurn}${
          bookedTurns.length > 1 ? `-${lastTurn}` : ""
        } ${
          isWaitlist ? "added to the waiting list" : "confirmed"
        } for ${bookingOption.label}, ${bookingOption.displayDate}.`
      });
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
        `${message}. If money was debited, please wait for provider/bank auto-reversal or contact the salon with your payment/order ID.`
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Barber Preference</span>
              <select
                className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] px-4 text-[#f4fbf8] outline-none transition focus:border-[#f87171] focus:ring-4 focus:ring-[#ef4444]/20"
                onChange={(event) =>
                  setForm((value) => ({ ...value, preferredBarber: event.target.value }))
                }
                value={form.preferredBarber}
              >
                {barberChoices.map((barber) => (
                  <option key={barber} value={barber}>{barber}</option>
                ))}
              </select>
              <span className="mt-2 block text-xs font-bold text-[#9db2ad]">
                {availableBarbers.length
                  ? `${availableBarbers.length} barber available for ${bookingOptionForBarber.label}.`
                  : "No barber is available for this day."}
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Offer / Coupon</span>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Tag
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71908a]"
                  size={18}
                />
                <input
                  className="h-12 w-full rounded-2xl border border-[#4a2525] bg-[#0b1714] pl-11 pr-4 uppercase text-[#f4fbf8] outline-none transition focus:border-[#f87171] focus:ring-4 focus:ring-[#ef4444]/20"
                  onChange={(event) => {
                    setAppliedCouponCode("");
                    setForm((value) => ({ ...value, couponCode: event.target.value.toUpperCase() }));
                  }}
                  placeholder="WELCOME10"
                  value={form.couponCode}
                />
              </div>
                <button
                  className="min-h-12 rounded-2xl border border-[#991b1b] bg-[#2a1111] px-5 text-sm font-black text-[#fca5a5] transition hover:bg-[#991b1b] hover:text-white"
                  onClick={appliedCouponCode ? () => setAppliedCouponCode("") : applyCoupon}
                  type="button"
                >
                  {appliedCouponCode ? "Remove" : "Apply"}
                </button>
              </div>
              {appliedCouponCode ? (
                <span className="mt-2 block text-xs font-bold text-[#f9c66d]">
                  {appliedCouponCode} applied.
                </span>
              ) : typedCouponCode ? (
                <span className="mt-2 block text-xs font-bold text-[#9db2ad]">
                  Click Apply to use this coupon.
                </span>
              ) : null}
            </label>
          </div>
          <div className="rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] px-4 py-3 text-sm font-black leading-6 text-[#f9c66d]">
            Booking is confirmed only after successful online payment through Cashfree.
          </div>
          <div className="rounded-2xl border border-[#35201f] bg-[#0b1714] p-4">
            <p className="text-sm font-bold text-[#9db2ad]">Selected Service</p>
            <div className="mt-2 flex items-center justify-between gap-3 border-b border-[#35201f] pb-3">
              <p className="font-black">
                {service.title}
                {peopleCount > 1 ? ` x ${peopleCount}` : ""}
              </p>
              <p className="font-black text-[#f9c66d]">
                {formatMoney(discountedServiceAmount)}
              </p>
            </div>
            <div className="mt-3 grid gap-2 text-sm font-bold text-[#9db2ad] sm:grid-cols-2">
              <div className="rounded-xl bg-[#101a18] px-3 py-2">
                Service duration: {service.time || "25 min"}
              </div>
              <div className="rounded-xl bg-[#101a18] px-3 py-2">
                Barber: {form.preferredBarber}
              </div>
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
              {discountAmount > 0 ? (
                <div className="flex items-center justify-between gap-3 text-[#f9c66d]">
                  <span>Coupon discount {couponCode}</span>
                  <span>-{formatMoney(discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span>Platform fee Rs. {PLATFORM_FEE_PER_PERSON} x {peopleCount}</span>
                <span>{formatMoney(platformFeeTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Cashfree charge 1.60%</span>
                <span>{formatMoney(chargePreview.cashfreeFee)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[#35201f] pt-2 text-base text-[#f4fbf8]">
                <span>Total payable</span>
                <span>{formatMoney(chargePreview.payableAmount)}</span>
              </div>
            </div>
          </div>
          <p className="rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] px-4 py-3 text-sm font-bold leading-6 text-[#f9c66d]">
            Cancellation is available before service starts. Refunds are for the eligible service amount only; platform fee and Cashfree charges are non-refundable.
          </p>
          <button
            className="shine-button flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 py-4 font-black text-white shadow-lg shadow-[#991b1b]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <>
                <ButtonSpinner />
                Opening Cashfree...
              </>
            ) : (
              <>
                Continue to Payment{" "}
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
  const [userAccount, setUserAccount] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [photoPreviewService, setPhotoPreviewService] = useState(null);
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
    waitingCount: 0,
    servingChairs: DEFAULT_BARBER_NAMES.map((barberName) => ({
      barberName,
      token: "-",
      customerName: "Chair available",
      status: "Idle"
    }))
  });
  const [queueLoading, setQueueLoading] = useState(true);
  const [bookingGate, setBookingGate] = useState({
    loading: true,
    open: false,
    message: "Checking salon booking status...",
    openingTime: "07:00",
    closingTime: "23:00",
    barbers: normalizeBarberAvailability(),
    coupons: DEFAULT_COUPONS,
    manualShopClosed: false,
    premiumActive: false
  });

  useBodyScrollLock(Boolean(photoPreviewService));

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
    if (!user?.uid) {
      setUserAccount(null);
      return undefined;
    }

    return onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        setUserAccount(snapshot.exists() ? snapshot.data() : null);
      },
      () => setUserAccount(null)
    );
  }, [user?.uid]);

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
        const inChairBookings = activeBookings.filter(
          (booking) => String(booking.status || "").toLowerCase() === "in_chair"
        );
        const chairBarberNames = (bookingGate.barbers || normalizeBarberAvailability())
          .map((barber) => barber.name);
        const servingChairs = chairBarberNames.map((barberName) => {
          const booking = inChairBookings.find(
            (item) => (item.barberName || item.preferredBarber) === barberName
          );
          return booking
            ? {
                barberName,
                token: booking.token || "-",
                customerName: booking.name || "Customer",
                status: "Haircut running"
              }
            : {
                barberName,
                token: "-",
                customerName: "Chair available",
                status: "Idle"
              };
        });
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
          waitingCount: waitingBookings.length,
          servingChairs
        });
        setQueueLoading(false);
      },
      () => {
        setQueueItems([]);
        setQueueStats({
          displayToken: 1,
          tokenLabel: "Next Token",
          tokenHint: "Queue empty now",
          waitingCount: 0,
          servingChairs: (bookingGate.barbers || normalizeBarberAvailability()).map((barber) => ({
            barberName: barber.name,
            token: "-",
            customerName: "Chair available",
            status: "Idle"
          }))
        });
        setQueueLoading(false);
      }
    );
  }, [page, bookingGate.barbers]);

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
    if (!["home", "booking", "barbers"].includes(page)) {
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
            barbers: normalizeBarberAvailability(),
            coupons: DEFAULT_COUPONS,
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
          barbers: normalizeBarberAvailability(salon),
          coupons: salon.coupons || DEFAULT_COUPONS,
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
          barbers: normalizeBarberAvailability(),
          coupons: DEFAULT_COUPONS,
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
      const message = getSafeErrorMessage(error, "Login failed. Please try again.");
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
      const message = getSafeErrorMessage(error, "Logout failed. Please try again.");
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

    if (userAccount?.blocked) {
      toast.error("Your booking access is blocked by the salon.");
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
        position="top-center"
        className="app-toaster"
        offset="92px"
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
      <Suspense fallback={<PageSkeleton />}>
        {page === "home" ? (
          <HomePage
            bookingGate={bookingGate}
            loginLoading={loginLoading}
            onLogin={login}
            onNavigate={navigatePage}
            onPhotoPreview={setPhotoPreviewService}
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
            onPhotoPreview={setPhotoPreviewService}
            onServiceSelect={requestServiceSelection}
            services={salonServices}
            user={user}
          />
        ) : null}
        {page === "barbers" ? <BarbersPage bookingGate={bookingGate} /> : null}
        {page === "about" ? <AboutPage /> : null}
        {page === "contact" ? <ContactPage user={user} /> : null}
        {page === "pricing" ? <PricingPage /> : null}
        {page === "gallery" ? <GalleryPage /> : null}
        {page === "staff" ? <StaffPage /> : null}
        {page === "faq" ? <FaqPage /> : null}
        {serviceSeoPages.includes(page) ? <ServiceSeoPage page={page} /> : null}
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
      </Suspense>
      <CheckoutModal
        bookingGate={bookingGate}
        onBookingSuccess={handleBookingSuccess}
        onClose={() => setSelectedService(null)}
        service={selectedService}
        user={user}
        userAccount={userAccount}
      />
      {photoPreviewService ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[120] grid place-items-center bg-[#020807]/85 p-3 backdrop-blur-xl sm:p-6"
          role="dialog"
        >
          <section className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-[#5a2525]/70 bg-[#07110f] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#5a2525]/60 px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff9e9e]">
                  Service photo
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  {photoPreviewService.title}
                </h3>
              </div>
              <button
                aria-label="Close photo preview"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#5a2525]/70 bg-[#111f1b] text-white transition hover:bg-[#991b1b]"
                onClick={() => setPhotoPreviewService(null)}
                type="button"
              >
                <X size={22} />
              </button>
            </div>
            <div className="grid min-h-0 flex-1 place-items-center bg-[#030907] p-3 sm:p-5">
              <img
                alt={photoPreviewService.title}
                className="max-h-[72vh] w-full rounded-3xl object-contain"
                decoding="async"
                loading="eager"
                src={photoPreviewService.imageUrl || ""}
              />
            </div>
          </section>
        </div>
      ) : null}
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
