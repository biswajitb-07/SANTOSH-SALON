import React from "react";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Toaster, toast } from "sonner";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Edit,
  Download,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  PhoneCall,
  QrCode,
  Scissors,
  Search,
  Settings,
  SkipForward,
  Sparkles,
  Trash2,
  UserCheck,
  UsersRound,
  WalletCards,
  X,
  XCircle
} from "lucide-react";
import { auth, db, googleProvider } from "./lib/firebase.js";
import { getAuthHeader } from "./lib/apiAuth.js";
import {
  ButtonSpinner,
  ConfirmDialog,
  PaginationControls,
  UserAvatar
} from "./components/common.jsx";
import { StatCard } from "./components/dashboard.jsx";
import { BookingDialog, ServiceDialog } from "./components/dialogs.jsx";
import {
  AdminAccessBlockedScreen,
  AdminLoadingScreen,
  AdminLoginScreen
} from "./pages/authScreens.jsx";
import {
  PlansPage,
  PublicLinkPage,
  SettingsPage
} from "./pages/profilePages.jsx";
import { UsersPage } from "./pages/UsersPage.jsx";
import {
  useCreateSubscriptionOrderMutation,
  useVerifySubscriptionPaymentMutation
} from "./store/api/subscriptionsApi.js";
import { store } from "./store/store.js";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STAFF_COUNT = 3;
const DAILY_CONFIRMED_LIMIT = 35;
const BOOKING_START_HOUR = 7;
const BOOKING_END_HOUR = 23;
const LUNCH_START_HOUR = 13;
const LUNCH_END_HOUR = 14;
const SLOT_MINUTES = 30;
const confirmedBookingStatuses = new Set(["waiting", "in_chair"]);
const activeTransferStatuses = new Set(["waiting", "in_chair", "waitlist"]);
const ADMIN_PAGE_SIZE = 6;
const queueStatusTabs = [
  { key: "booking", label: "Confirmed", statuses: ["waiting"] },
  { key: "waitlist", label: "Waiting", statuses: ["waitlist"] },
  { key: "in_chair", label: "In Chair", statuses: ["in_chair"] },
  { key: "completed", label: "Complete", statuses: ["completed"] },
  { key: "skipped", label: "Skip", statuses: ["skipped"] }
];

const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || "http://localhost:5173";
const ADMIN_ALLOWED_EMAILS = (import.meta.env.VITE_ADMIN_ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const loadRazorpayCheckout = () =>
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

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "queue", label: "Queue", icon: UsersRound },
  { key: "services", label: "Haircut Design", icon: Scissors },
  { key: "refunds", label: "Refunds", icon: CreditCard },
  { key: "users", label: "Users", icon: UserCheck },
  { key: "public-link", label: "Public Link", icon: QrCode },
  { key: "plans", label: "Plans", icon: WalletCards },
  { key: "settings", label: "Settings", icon: Settings }
];

const getAdminRoute = () => {
  if (typeof window === "undefined") return "dashboard";

  const page = new URLSearchParams(window.location.search).get("page");
  return navItems.some((item) => item.key === page) ? page : "dashboard";
};

const writeAdminRoute = (page, replace = false) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set("page", page);
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
};

const defaultSalonProfile = {
  name: "Santosh Salon",
  slug: "santosh",
  phone: "+91 98765 43210",
  address: "Main Market Road, Near City Chowk",
  openingTime: "07:00",
  closingTime: "23:00",
  manualShopClosed: false,
  manualCloseReason: ""
};

const defaultServiceDraft = {
  title: "",
  time: "25 min",
  amount: 120,
  imageUrl: "",
  imagePublicId: "",
  imageFile: null,
  imagePreview: "",
  active: true
};

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
      slots.push({
        value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(
          2,
          "0"
        )}`,
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

    return String(first.id || "").localeCompare(String(second.id || ""));
  });

const getVisibleAdminTimeSlots = (bookingDate = toDateInputValue(new Date())) => {
  const today = toDateInputValue(new Date());
  if (!bookingDate || bookingDate < today) return [];
  if (bookingDate > today) return timeSlots;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return timeSlots.filter((slot) => minutesFromSlot(slot.value) > currentMinutes);
};

const getDisplayDate = (dateValue) => {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const getTomorrowDateValue = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDateInputValue(date);
};

const getRecentDateValues = (days = 7) => {
  const today = new Date();

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return toDateInputValue(date);
  });
};

const getShortDayLabel = (dateValue) =>
  new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short"
  });

const serviceChartColors = [
  "#991b1b",
  "#f97316",
  "#0ea5e9",
  "#eab308",
  "#7c3aed",
  "#dc2626"
];

const shouldCountRevenue = (item) => {
  const status = String(item.status || "").toLowerCase();
  const paymentStatus = String(item.paymentStatus || "").toLowerCase();
  const provider = String(item.paymentProvider || "").toLowerCase();

  if (["cancelled", "skipped", "waitlist"].includes(status)) return false;
  if (["paid", "admin_created"].includes(paymentStatus)) return true;
  return provider === "cash_on_delivery" && status === "completed";
};

const hasChartValue = (data, keys) =>
  data.some((item) => keys.some((key) => Number(item[key] || 0) > 0));

const ChartEmpty = ({ title, text, className = "h-48" }) => (
  <div
    className={`grid place-items-center rounded-3xl bg-[#101a18] px-5 text-center ${className}`}
  >
    <div>
      <p className="font-black text-[#f4fbf8]">{title}</p>
      <p className="mt-1 text-sm font-bold text-[#9db2ad]">{text}</p>
    </div>
  </div>
);

const normalizeCustomer = (snapshotDoc, displayToken) => {
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
    createdAt: data.createdAt,
    createdSort: data.createdSort || 0
  };
};

const normalizeService = (snapshotDoc) => {
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

const normalizeUser = (snapshotDoc) => {
  const data = snapshotDoc.data();

  return {
    id: snapshotDoc.id,
    name: data.name || "Customer",
    email: data.email || "-",
    phone: data.phone || data.mobile || "-",
    photoURL: data.photoURL || "",
    provider: data.provider || "google.com",
    updatedAt: data.updatedAt
  };
};

const normalizeRefund = (snapshotDoc) => {
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
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdDateValue: createdAtDate ? toDateInputValue(createdAtDate) : "",
    updatedDateValue: updatedAtDate ? toDateInputValue(updatedAtDate) : ""
  };
};

const statusLabel = (status) =>
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

const getRequestErrorMessage = (error, fallback) =>
  error?.data?.error ||
  error?.error ||
  error?.message ||
  error?.details?.error?.description ||
  fallback;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });

const getPremiumUntilDate = (profile) => {
  const timestamp = profile?.premiumUntil;
  if (!timestamp) return null;
  if (timestamp?.toDate) return timestamp.toDate();

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isPremiumActive = (profile) => {
  const premiumUntil = getPremiumUntilDate(profile);
  return (
    profile?.premiumEnabled === true &&
    profile?.paymentStatus === "active" &&
    (!premiumUntil || premiumUntil.getTime() > Date.now())
  );
};

const formatDateTime = (date) =>
  date
    ? date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";

function App() {
  const [createSubscriptionOrder] = useCreateSubscriptionOrderMutation();
  const [verifySubscriptionPayment] = useVerifySubscriptionPaymentMutation();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [activePage, setActivePage] = useState(() => getAdminRoute());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queueItems, setQueueItems] = useState([]);
  const [analyticsItems, setAnalyticsItems] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueStatusTab, setQueueStatusTab] = useState("booking");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [salonProfile, setSalonProfile] = useState(defaultSalonProfile);
  const [settingsDraft, setSettingsDraft] = useState(defaultSalonProfile);
  const [serviceItems, setServiceItems] = useState([]);
  const [serviceDraft, setServiceDraft] = useState(defaultServiceDraft);
  const [editingServiceId, setEditingServiceId] = useState("");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [refundRequests, setRefundRequests] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(true);
  const [editingBookingId, setEditingBookingId] = useState("");
  const [bookingDraft, setBookingDraft] = useState(null);
  const [adminBookingMode, setAdminBookingMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [queuePage, setQueuePage] = useState(1);
  const [servicePage, setServicePage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [adminClockTick, setAdminClockTick] = useState(Date.now());
  const [notice, setNotice] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const reindexingDatesRef = useRef(new Set());

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;

    if (!user) {
      setActivePage("dashboard");
      if (typeof window !== "undefined" && window.location.search) {
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}${window.location.hash}`
        );
      }
      return undefined;
    }

    writeAdminRoute(activePage, true);

    const syncRoute = () => {
      setActivePage(getAdminRoute());
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, [authLoading, user]);

  const navigateAdminPage = (page) => {
    setActivePage(page);
    writeAdminRoute(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.classList.remove("drawer-open");
      document.body.style.removeProperty("--scrollbar-width");
      return undefined;
    }

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
    document.body.classList.add("drawer-open");

    return () => {
      document.body.classList.remove("drawer-open");
      document.body.style.removeProperty("--scrollbar-width");
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const timer = window.setInterval(() => setAdminClockTick(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!bookingDraft) return;

    const today = toDateInputValue(new Date());
    const safeDate =
      !bookingDraft.bookingDate || bookingDraft.bookingDate < today
        ? today
        : bookingDraft.bookingDate;
    const visibleSlots = getAdminBookableSlots(safeDate, bookingDraft.timeSlot);
    const safeTimeSlot = visibleSlots.some(
      (slot) => slot.value === bookingDraft.timeSlot
    )
      ? bookingDraft.timeSlot
      : visibleSlots[0]?.value || "";

    if (
      safeDate !== bookingDraft.bookingDate ||
      safeTimeSlot !== bookingDraft.timeSlot
    ) {
      setBookingDraft((value) =>
        value
          ? {
              ...value,
              bookingDate: safeDate,
              timeSlot: safeTimeSlot
            }
          : value
      );
    }
  }, [adminClockTick, bookingDraft?.bookingDate, bookingDraft?.timeSlot]);

  useEffect(() => {
    if (!user) return undefined;

    setQueueLoading(true);
    const today = toDateInputValue(new Date());
    const tomorrow = getTomorrowDateValue();
    const queueRef = query(
      collection(db, "customers"),
      where("bookingDate", "in", [today, tomorrow])
    );

    return onSnapshot(
      queueRef,
      (snapshot) => {
        const nextQueue = sortBookingsForTurns(
          snapshot.docs.map((snapshotDoc) => normalizeCustomer(snapshotDoc))
        );
        setQueueItems(nextQueue);
        setQueueLoading(false);
      },
      () => {
        setQueueItems([]);
        setQueueLoading(false);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const analyticsDates = getRecentDateValues(7);
    const analyticsRef = query(
      collection(db, "customers"),
      where("bookingDate", "in", analyticsDates)
    );

    return onSnapshot(
      analyticsRef,
      (snapshot) => {
        setAnalyticsItems(
          sortBookingsForTurns(snapshot.docs.map((snapshotDoc) => normalizeCustomer(snapshotDoc)))
        );
      },
      () => setAnalyticsItems([])
    );
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const servicesRef = collection(db, "services");

    return onSnapshot(
      servicesRef,
      (snapshot) => {
        setServiceItems(
          snapshot.docs
            .map(normalizeService)
            .sort(
              (first, second) =>
                first.sortOrder - second.sortOrder ||
                first.title.localeCompare(second.title)
            )
        );
      },
      () => {
        setServiceItems([]);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    setUsersLoading(true);
    const usersRef = query(collection(db, "users"), orderBy("updatedAt", "desc"));

    return onSnapshot(
      usersRef,
      (snapshot) => {
        setRegisteredUsers(snapshot.docs.map(normalizeUser));
        setUsersLoading(false);
      },
      () => {
        setRegisteredUsers([]);
        setUsersLoading(false);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    setRefundsLoading(true);
    const refundsRef = query(
      collection(db, "refundRequests"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      refundsRef,
      (snapshot) => {
        setRefundRequests(snapshot.docs.map(normalizeRefund));
        setRefundsLoading(false);
      },
      () => {
        setRefundRequests([]);
        setRefundsLoading(false);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    return onSnapshot(
      doc(db, "salons", user.uid),
      (salonDoc) => {
        const nextProfile = salonDoc.exists()
          ? { ...defaultSalonProfile, ...salonDoc.data() }
          : {
              ...defaultSalonProfile,
              ownerId: user.uid,
              ownerEmail: user.email || ""
            };
        setSalonProfile(nextProfile);
        setSettingsDraft(nextProfile);
      },
      () => {
        setSalonProfile(defaultSalonProfile);
        setSettingsDraft(defaultSalonProfile);
      }
    );
  }, [user]);

  const handleGoogleLogin = async () => {
    setAuthError("");
    setActionLoading("login");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const message = error.message || "Google login failed";
      setAuthError(message);
      toast.error(message);
    } finally {
      setActionLoading("");
    }
  };

  const performLogout = async () => {
    setActionLoading("logout");
    try {
      await signOut(auth);
      setConfirmDialog(null);
    } finally {
      setActionLoading("");
    }
  };

  const handleLogout = () => {
    setConfirmDialog({
      title: "Confirm logout",
      message: "Are you sure you want to logout from the admin panel?",
      confirmLabel: "Logout",
      loadingKey: "logout",
      onConfirm: performLogout
    });
  };

  function getAdminBookableSlots(bookingDate, currentSlot = "") {
    const visibleSlots = getVisibleAdminTimeSlots(bookingDate);
    if (!visibleSlots.length) return [];

    const slotCounts = queueItems.reduce((counts, booking) => {
      if (booking.id === editingBookingId) return counts;
      if (booking.bookingDate !== bookingDate) return counts;
      if (
        !confirmedBookingStatuses.has(
          String(booking.status || "").toLowerCase()
        )
      ) {
        return counts;
      }

      const slot = booking.timeSlot || "";
      if (slot) counts[slot] = (counts[slot] || 0) + 1;
      return counts;
    }, {});

    const firstAvailableSlot = visibleSlots.find(
      (slot) => Number(slotCounts[slot.value] || 0) < STAFF_COUNT
    );

    if (!firstAvailableSlot) return [];

    if (!adminBookingMode && currentSlot) {
      const current = visibleSlots.find((slot) => slot.value === currentSlot);
      if (current?.value === firstAvailableSlot.value) return [current];
    }

    return [firstAvailableSlot];
  }

  const todayQueueDate = toDateInputValue(new Date());
  const tomorrowQueueDate = getTomorrowDateValue();
  const todaysQueueItems = queueItems.filter(
    (item) => item.bookingDate === todayQueueDate
  );
  const tomorrowQueueItems = queueItems.filter(
    (item) => item.bookingDate === tomorrowQueueDate
  );
  const activeQueueItems = todaysQueueItems.filter((item) =>
    activeTransferStatuses.has(String(item.status || "").toLowerCase())
  );
  const activeDisplayQueue = activeQueueItems.map((item, index) => ({
    ...item,
    token: index + 1
  }));
  const selectedQueueTab =
    queueStatusTabs.find((tab) => tab.key === queueStatusTab) ||
    queueStatusTabs[0];
  const filteredQueue = (
    activePage === "queue"
      ? todaysQueueItems.filter((item) =>
          selectedQueueTab.statuses.includes(
            String(item.status || "").toLowerCase()
          )
        )
      : activeDisplayQueue
  ).map((item, index) => ({ ...item, token: index + 1 }));
  const filteredUsers = registeredUsers.filter((customer) => {
    const value = `${customer.name} ${customer.email} ${customer.phone} ${customer.provider}`;
    return value.toLowerCase().includes(userSearchTerm.toLowerCase());
  });
  const queueTotalPages = Math.max(1, Math.ceil(filteredQueue.length / ADMIN_PAGE_SIZE));
  const safeQueuePage = Math.min(queuePage, queueTotalPages);
  const paginatedQueue = filteredQueue.slice(
    (safeQueuePage - 1) * ADMIN_PAGE_SIZE,
    safeQueuePage * ADMIN_PAGE_SIZE
  );
  const serviceTotalPages = Math.max(1, Math.ceil(serviceItems.length / ADMIN_PAGE_SIZE));
  const safeServicePage = Math.min(servicePage, serviceTotalPages);
  const paginatedServices = serviceItems.slice(
    (safeServicePage - 1) * ADMIN_PAGE_SIZE,
    safeServicePage * ADMIN_PAGE_SIZE
  );
  const refundTotalPages = Math.max(1, Math.ceil(refundRequests.length / ADMIN_PAGE_SIZE));
  const safeRefundPage = Math.min(refundPage, refundTotalPages);
  const paginatedRefunds = refundRequests.slice(
    (safeRefundPage - 1) * ADMIN_PAGE_SIZE,
    safeRefundPage * ADMIN_PAGE_SIZE
  );
  const usersTotalPages = Math.max(1, Math.ceil(filteredUsers.length / ADMIN_PAGE_SIZE));
  const safeUsersPage = Math.min(usersPage, usersTotalPages);
  const paginatedUsers = filteredUsers.slice(
    (safeUsersPage - 1) * ADMIN_PAGE_SIZE,
    safeUsersPage * ADMIN_PAGE_SIZE
  );
  const usersWithPhone = registeredUsers.filter(
    (customer) => customer.phone && customer.phone !== "-"
  ).length;
  const googleUsers = registeredUsers.filter((customer) =>
    String(customer.provider || "").includes("google")
  ).length;

  useEffect(() => {
    setQueuePage(1);
  }, [queueStatusTab, filteredQueue.length]);

  useEffect(() => {
    setServicePage(1);
  }, [serviceItems.length]);

  useEffect(() => {
    setRefundPage(1);
  }, [refundRequests.length]);

  useEffect(() => {
    setUsersPage(1);
  }, [userSearchTerm, filteredUsers.length]);

  const waitingCount = activeQueueItems.filter((item) =>
    ["waiting", "waitlist"].includes(String(item.status || "").toLowerCase())
  ).length;
  const inChairCount = todaysQueueItems.filter(
    (item) => String(item.status || "").toLowerCase() === "in_chair"
  ).length;
  const completedCount = todaysQueueItems.filter(
    (item) => item.status === "completed"
  ).length;
  const todayRevenueAmount = todaysQueueItems
    .filter(shouldCountRevenue)
    .reduce((total, item) => total + Number(item.amount || 0), 0);
  const todayRefundAmount = refundRequests
    .filter((refund) => {
      const status = String(refund.status || "").toLowerCase();
      const dateValue = refund.updatedDateValue || refund.createdDateValue;
      return status === "completed" && dateValue === todayQueueDate;
    })
    .reduce((total, refund) => total + Number(refund.amount || 0), 0);
  const totalRefundAmount = refundRequests
    .filter((refund) => String(refund.status || "").toLowerCase() === "completed")
    .reduce((total, refund) => total + Number(refund.amount || 0), 0);
  const pendingRefundCount = refundRequests.filter((refund) =>
    ["requested", "reviewing", "processing"].includes(
      String(refund.status || "").toLowerCase()
    )
  ).length;
  const netRevenueToday = Math.max(0, todayRevenueAmount - todayRefundAmount);
  const tomorrowBookingCount = tomorrowQueueItems.filter((item) =>
    ["waiting", "waitlist", "in_chair"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;
  const analyticsDateValues = getRecentDateValues(7);
  const weeklyFlowData = analyticsDateValues.map((dateValue) => {
    const bookingsForDate = analyticsItems.filter(
      (item) => item.bookingDate === dateValue
    );

    return {
      day: getShortDayLabel(dateValue),
      bookings: bookingsForDate.length,
      completed: bookingsForDate.filter(
        (item) => String(item.status || "").toLowerCase() === "completed"
      ).length
    };
  });
  const revenueChartData = analyticsDateValues.map((dateValue) => {
    const bookingsForDate = analyticsItems.filter(
      (item) => item.bookingDate === dateValue
    );
    const revenue = bookingsForDate
      .filter(shouldCountRevenue)
      .reduce((total, item) => total + Number(item.amount || 0), 0);
    const refunds = refundRequests
      .filter((refund) => {
        const status = String(refund.status || "").toLowerCase();
        const refundDate = refund.updatedDateValue || refund.createdDateValue;
        return status === "completed" && refundDate === dateValue;
      })
      .reduce((total, refund) => total + Number(refund.amount || 0), 0);

    return {
      day: getShortDayLabel(dateValue),
      revenue,
      refunds,
      net: Math.max(0, revenue - refunds)
    };
  });
  const serviceSplitData = Object.values(
    analyticsItems
      .filter((item) => !["cancelled", "skipped"].includes(String(item.status || "").toLowerCase()))
      .reduce((accumulator, item) => {
        const key = item.service || "Service";
        accumulator[key] = accumulator[key] || {
          name: key,
          value: 0,
          color:
            serviceChartColors[Object.keys(accumulator).length % serviceChartColors.length]
        };
        accumulator[key].value += 1;
        return accumulator;
      }, {})
  );
  const hourlyRushData = timeSlots
    .filter((_, index) => index % 2 === 0)
    .map((slot) => {
      const hour = Number(slot.value.split(":")[0]);
      const matchingSlots = timeSlots
        .filter((item) => Number(item.value.split(":")[0]) === hour)
        .map((item) => item.value);
      const count = todaysQueueItems.filter((item) =>
        matchingSlots.includes(item.timeSlot)
      ).length;

      return {
        time: slot.label.replace(":00", ""),
        bookings: count
      };
    })
    .filter((item, index, list) => list.findIndex((value) => value.time === item.time) === index);
  const dashboardSummary = [
    { label: "Revenue", value: `Rs. ${todayRevenueAmount.toFixed(0)}` },
    { label: "Refunded", value: `Rs. ${todayRefundAmount.toFixed(0)}` },
    { label: "Net", value: `Rs. ${netRevenueToday.toFixed(0)}` },
    { label: "Pending refunds", value: String(pendingRefundCount).padStart(2, "0") },
    { label: "Total refunded", value: `Rs. ${totalRefundAmount.toFixed(0)}` }
  ];
  const queueStatusChartData = queueStatusTabs.map((tab, index) => ({
    name: tab.label,
    value: todaysQueueItems.filter((item) =>
      tab.statuses.includes(String(item.status || "").toLowerCase())
    ).length,
    color: serviceChartColors[index % serviceChartColors.length]
  }));
  const paymentMethodChartData = Object.values(
    todaysQueueItems.reduce((accumulator, item) => {
      const key = statusLabel(item.paymentProvider || "Unknown");
      accumulator[key] = accumulator[key] || {
        name: key,
        value: 0,
        color:
          serviceChartColors[Object.keys(accumulator).length % serviceChartColors.length]
      };
      accumulator[key].value += 1;
      return accumulator;
    }, {})
  );
  const refundStatusChartData = Object.values(
    refundRequests.reduce((accumulator, refund) => {
      const key = statusLabel(refund.status || "requested");
      accumulator[key] = accumulator[key] || {
        name: key,
        value: 0,
        color:
          serviceChartColors[Object.keys(accumulator).length % serviceChartColors.length]
      };
      accumulator[key].value += 1;
      return accumulator;
    }, {})
  );
  const hasWeeklyFlow = hasChartValue(weeklyFlowData, ["bookings", "completed"]);
  const hasRevenueChart = hasChartValue(revenueChartData, ["revenue", "refunds", "net"]);
  const hasServiceSplit = serviceSplitData.some((item) => item.value > 0);
  const hasHourlyRush = hasChartValue(hourlyRushData, ["bookings"]);
  const hasQueueStatus = queueStatusChartData.some((item) => item.value > 0);
  const hasPaymentMethods = paymentMethodChartData.some((item) => item.value > 0);
  const hasRefundStatuses = refundStatusChartData.some((item) => item.value > 0);
  const currentCustomer =
    activeDisplayQueue.find((item) => item.status === "in_chair") ||
    activeDisplayQueue.find((item) => item.status === "waiting");
  const todayDateValue = toDateInputValue(new Date());
  const adminBookingDateValue =
    bookingDraft?.bookingDate && bookingDraft.bookingDate >= todayDateValue
      ? bookingDraft.bookingDate
      : todayDateValue;
  const adminBookingSlots = bookingDraft
    ? getAdminBookableSlots(adminBookingDateValue, bookingDraft.timeSlot)
    : timeSlots;
  const adminBookingTimeSlotValue = adminBookingSlots.some(
    (slot) => slot.value === bookingDraft?.timeSlot
  )
    ? bookingDraft?.timeSlot
    : adminBookingSlots[0]?.value || "";
  const publicQueueLink = `${CLIENT_URL}/q/${salonProfile.slug || user?.uid || "salon"}`;
  const premiumActive = isPremiumActive(salonProfile);
  const premiumUntilDate = getPremiumUntilDate(salonProfile);
  const activeNavItem =
    navItems.find((item) => item.key === activePage) || navItems[0];
  const shopManuallyClosed = salonProfile.manualShopClosed === true;

  const getNextTokenForDate = async (bookingDate) => {
    const snapshot = await getDocs(
      query(collection(db, "customers"), where("bookingDate", "==", bookingDate))
    );
    const activeCount = snapshot.docs.filter((snapshotDoc) =>
      activeTransferStatuses.has(
        String(snapshotDoc.data().status || "").toLowerCase()
      )
    ).length;
    return activeCount + 1;
  };

  const reindexQueueDate = async (bookingDate) => {
    if (!bookingDate) return [];

    const snapshot = await getDocs(
      query(collection(db, "customers"), where("bookingDate", "==", bookingDate))
    );
    const activeBookings = sortBookingsForTurns(
      snapshot.docs
        .map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ref: snapshotDoc.ref,
          ...snapshotDoc.data()
        }))
        .filter((booking) =>
          activeTransferStatuses.has(String(booking.status || "").toLowerCase())
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

  useEffect(() => {
    if (!queueItems.length) return;

    [todayQueueDate, tomorrowQueueDate].forEach((bookingDate) => {
      const activeBookings = sortBookingsForTurns(
        queueItems.filter(
          (item) =>
            item.bookingDate === bookingDate &&
            activeTransferStatuses.has(String(item.status || "").toLowerCase())
        )
      );
      const needsReindex = activeBookings.some(
        (item, index) =>
          Number(item.token || 0) !== index + 1 ||
          Number(item.peopleAhead || 0) !== index
      );

      if (!needsReindex || reindexingDatesRef.current.has(bookingDate)) return;

      reindexingDatesRef.current.add(bookingDate);
      reindexQueueDate(bookingDate).finally(() => {
        reindexingDatesRef.current.delete(bookingDate);
      });
    });
  }, [queueItems, todayQueueDate, tomorrowQueueDate]);

  const getConfirmedCountForDate = async (bookingDate) => {
    const snapshot = await getDocs(
      query(collection(db, "customers"), where("bookingDate", "==", bookingDate))
    );
    return snapshot.docs.filter((snapshotDoc) =>
      confirmedBookingStatuses.has(
        String(snapshotDoc.data().status || "").toLowerCase()
      )
    ).length;
  };

  const getSlotConfirmedCountForDate = async (
    bookingDate,
    timeSlot,
    excludeId = ""
  ) => {
    if (!bookingDate || !timeSlot) return 0;

    const snapshot = await getDocs(
      query(collection(db, "customers"), where("bookingDate", "==", bookingDate))
    );

    return snapshot.docs.filter((snapshotDoc) => {
      const booking = snapshotDoc.data();
      return (
        snapshotDoc.id !== excludeId &&
        booking.timeSlot === timeSlot &&
        confirmedBookingStatuses.has(
          String(booking.status || "").toLowerCase()
        )
      );
    }).length;
  };

  const promoteNextWaitlist = async (bookingDate) => {
    if (!bookingDate) return;

    const confirmedCount = await getConfirmedCountForDate(bookingDate);
    if (confirmedCount >= DAILY_CONFIRMED_LIMIT) return;

    const snapshot = await getDocs(
      query(collection(db, "customers"), where("bookingDate", "==", bookingDate))
    );
    const nextWaitlist = snapshot.docs
      .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
      .filter(
        (booking) => String(booking.status || "").toLowerCase() === "waitlist"
      )
      .sort((first, second) => {
        const firstTime = first.createdAt?.toMillis?.() || 0;
        const secondTime = second.createdAt?.toMillis?.() || 0;
        return firstTime - secondTime;
      })[0];

    if (!nextWaitlist) return;

    await updateDoc(doc(db, "customers", nextWaitlist.id), {
      status: "waiting",
      promotedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    toast.success(`Waiting token ${nextWaitlist.token} moved to confirmed.`);
  };

  const updateCustomerStatus = async (customer, status) => {
    setNotice("");

    if (!customer?.id) {
      const message = "Customer id missing.";
      setNotice(message);
      toast.warning(message);
      return;
    }

    const loadingKey = `customer-${customer.id}-${status}`;
    setActionLoading(loadingKey);
    try {
      await updateDoc(doc(db, "customers", customer.id), {
        status,
        updatedAt: serverTimestamp()
      });
      if (["completed", "skipped", "cancelled"].includes(status)) {
        await promoteNextWaitlist(customer.bookingDate);
      }
      await reindexQueueDate(customer.bookingDate);
      const message = `Token ${customer.token} marked ${statusLabel(status)}.`;
      setNotice(message);
      toast.success(message);
    } catch (error) {
      const message = error.message || "Unable to update queue status.";
      setNotice(message);
      toast.error(message);
    } finally {
      setActionLoading("");
    }
  };

  const openBookingEditor = (customer) => {
    if (!customer?.id) {
      toast.warning("Customer id missing.");
      return;
    }

    setAdminBookingMode(false);
    setEditingBookingId(customer.id);
    setBookingDraft({
      name: customer.name,
      mobile: customer.phone,
      email: customer.email || "",
      service: customer.service,
      bookingDate: customer.bookingDate,
      timeSlot: customer.timeSlot || timeSlots[0]?.value || "",
      status: customer.status,
      amount: customer.amount || 0
    });
  };

  const openAdminBookingDialog = () => {
    const firstService = serviceItems.find((service) => service.active);
    const today = toDateInputValue(new Date());
    const visibleSlots = getAdminBookableSlots(today);
    setAdminBookingMode(true);
    setEditingBookingId("");
    setBookingDraft({
      name: "",
      mobile: "",
      email: "",
      service: firstService?.title || "Classic Haircut",
      bookingDate: today,
      timeSlot: visibleSlots[0]?.value || "",
      status: "waiting",
      amount: firstService?.amount || 120,
      paymentProvider: "admin",
      paymentStatus: "admin_created"
    });
  };

  const saveBookingEdit = async (event) => {
    event.preventDefault();
    if ((!editingBookingId && !adminBookingMode) || !bookingDraft) return;

    setActionLoading("booking-save");
    try {
      const today = toDateInputValue(new Date());
      const draftDate =
        !bookingDraft.bookingDate || bookingDraft.bookingDate < today
          ? today
          : bookingDraft.bookingDate;
      const visibleSlots = getAdminBookableSlots(draftDate, bookingDraft.timeSlot);
      const effectiveTimeSlot = visibleSlots.some(
        (slot) => slot.value === bookingDraft.timeSlot
      )
        ? bookingDraft.timeSlot
        : visibleSlots[0]?.value || "";

      if (draftDate < today) {
        toast.error("Past dates are not allowed for booking.");
        setActionLoading("");
        return;
      }

      if (
        confirmedBookingStatuses.has(
          String(bookingDraft.status || "waiting").toLowerCase()
        ) &&
        !effectiveTimeSlot
      ) {
        toast.error("Please choose an available future slot.");
        setActionLoading("");
        return;
      }

      if (adminBookingMode) {
        const matchedUser = registeredUsers.find(
          (registeredUser) =>
            registeredUser.email.toLowerCase() ===
            bookingDraft.email.trim().toLowerCase()
        );

        if (!matchedUser) {
          toast.error("The user email must be registered on the website.");
          setActionLoading("");
          return;
        }

        const bookingDate = draftDate;
        const selectedSlot =
          timeSlots.find((slot) => slot.value === effectiveTimeSlot) ||
          timeSlots[0];
        const selectedStatus = bookingDraft.status || "waiting";
        const slotConfirmedCount = await getSlotConfirmedCountForDate(
          bookingDate,
          selectedSlot?.value || ""
        );
        if (
          confirmedBookingStatuses.has(String(selectedStatus).toLowerCase()) &&
          slotConfirmedCount >= STAFF_COUNT
        ) {
          toast.error("This time slot already has 3 bookings. Please choose another slot.");
          setActionLoading("");
          return;
        }
        const bookingRef = await addDoc(collection(db, "customers"), {
          name: bookingDraft.name.trim() || matchedUser.name,
          mobile: bookingDraft.mobile.trim() || matchedUser.phone,
          email: matchedUser.email,
          service: bookingDraft.service.trim(),
          bookingDate,
          bookingDay: bookingDate === toDateInputValue(new Date()) ? "today" : "",
          bookingLabel:
            bookingDate === toDateInputValue(new Date()) ? "Today" : "Scheduled",
          bookingDisplayDate: getDisplayDate(bookingDate),
          timeSlot: selectedSlot?.value || "",
          timeSlotLabel: selectedSlot?.label || "",
          token: 0,
          peopleAhead: 0,
          status: selectedStatus,
          amount: Number(bookingDraft.amount || 0),
          payableAmount: Number(bookingDraft.amount || 0),
          paymentProvider: "admin",
          paymentStatus: "admin_created",
          userId: matchedUser.id,
          source: "admin-booking",
          createdSort: Date.now(),
          arrivalNote:
            "Please reach the salon 40 minutes before your turn for a quicker haircut. Cancel your booking if you cannot visit.",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        const orderedBookings = await reindexQueueDate(bookingDate);
        const createdTurn =
          orderedBookings.find((booking) => booking.id === bookingRef.id)?.token ||
          "-";

        setAdminBookingMode(false);
        setBookingDraft(null);
        toast.success(`Admin booking created. Turn #${createdTurn}.`);
        setActionLoading("");
        return;
      }

      const selectedSlot =
        timeSlots.find((slot) => slot.value === effectiveTimeSlot) ||
        timeSlots[0];
      const slotConfirmedCount = await getSlotConfirmedCountForDate(
        bookingDraft.bookingDate,
        selectedSlot?.value || "",
        editingBookingId
      );
      if (
        confirmedBookingStatuses.has(
          String(bookingDraft.status || "").toLowerCase()
        ) &&
        slotConfirmedCount >= STAFF_COUNT
      ) {
        toast.error("This time slot already has 3 bookings. Please choose another slot.");
        setActionLoading("");
        return;
      }
      await updateDoc(doc(db, "customers", editingBookingId), {
        name: bookingDraft.name.trim(),
        mobile: bookingDraft.mobile.trim(),
        email: bookingDraft.email?.trim() || "",
        service: bookingDraft.service.trim(),
        bookingDate: draftDate,
        bookingDisplayDate: getDisplayDate(draftDate),
        timeSlot: selectedSlot?.value || "",
        timeSlotLabel: selectedSlot?.label || "",
        status: bookingDraft.status,
        amount: Number(bookingDraft.amount || 0),
        updatedAt: serverTimestamp()
      });
      await reindexQueueDate(draftDate);
      setEditingBookingId("");
      setBookingDraft(null);
      toast.success("Booking updated.");
    } catch (error) {
      toast.error(error.message || "Unable to update booking.");
    } finally {
      setActionLoading("");
    }
  };

  const deleteBooking = async (customer) => {
    if (!customer?.id) {
      toast.warning("Customer id missing.");
      return;
    }

    const loadingKey = `booking-delete-${customer.id}`;
    setActionLoading(loadingKey);
    try {
      await deleteDoc(doc(db, "customers", customer.id));
      await promoteNextWaitlist(customer.bookingDate);
      await reindexQueueDate(customer.bookingDate);
      setConfirmDialog(null);
      toast.success(`Token ${customer.token} deleted.`);
    } catch (error) {
      toast.error(error.message || "Unable to delete booking.");
    } finally {
      setActionLoading("");
    }
  };

  const resetServiceForm = () => {
    setEditingServiceId("");
    setServiceDraft(defaultServiceDraft);
    setServiceDialogOpen(false);
  };

  const openAddServiceDialog = () => {
    setEditingServiceId("");
    setServiceDraft(defaultServiceDraft);
    setServiceDialogOpen(true);
  };

  const editService = (service) => {
    setEditingServiceId(service.id);
    setServiceDraft({
      title: service.title,
      time: service.time,
      amount: service.amount,
      imageUrl: service.imageUrl,
      imagePublicId: service.imagePublicId,
      imageFile: null,
      imagePreview: "",
      active: service.active
    });
    setServiceDialogOpen(true);
  };

  const uploadServiceImage = async (file) => {
    const imageDataUrl = await fileToDataUrl(file);
    const authHeader = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/cloudinary/service-image/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader
      },
      body: JSON.stringify({ imageDataUrl })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Cloudinary image upload failed.");
    }

    return data;
  };

  const deleteCloudinaryImage = async (publicId) => {
    if (!publicId) return;

    const authHeader = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/cloudinary/service-image/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader
      },
      body: JSON.stringify({ publicId })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Cloudinary image delete failed.");
    }
  };

  const handleServiceImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be smaller than 8MB.");
      return;
    }

    setServiceDraft((value) => ({
      ...value,
      imageFile: file,
      imagePreview: URL.createObjectURL(file)
    }));
  };

  const saveService = async (event) => {
    event.preventDefault();
    const amount = Number(serviceDraft.amount || 0);

    if (!serviceDraft.title.trim() || amount <= 0) {
      toast.error("Service title and a valid amount are required.");
      return;
    }

    const previousService = editingServiceId
      ? serviceItems.find((service) => service.id === editingServiceId)
      : null;
    let nextImage = {
      imageUrl: serviceDraft.imageUrl.trim(),
      imagePublicId: serviceDraft.imagePublicId || ""
    };

    const payload = {
      title: serviceDraft.title.trim(),
      time: serviceDraft.time.trim() || "25 min",
      amount,
      price: `Rs. ${amount}`,
      active: serviceDraft.active,
      updatedAt: serverTimestamp()
    };

    setActionLoading("service-save");
    try {
      if (serviceDraft.imageFile) {
        nextImage = await uploadServiceImage(serviceDraft.imageFile);
      }

      if (editingServiceId) {
        await updateDoc(doc(db, "services", editingServiceId), {
          ...payload,
          ...nextImage
        });
        if (
          serviceDraft.imageFile &&
          previousService?.imagePublicId &&
          previousService.imagePublicId !== nextImage.imagePublicId
        ) {
          await deleteCloudinaryImage(previousService.imagePublicId);
        }
        toast.success("Haircut design updated.");
      } else {
        await addDoc(collection(db, "services"), {
          ...payload,
          ...nextImage,
          createdAt: serverTimestamp()
        });
        toast.success("Haircut design added.");
      }
      resetServiceForm();
    } catch (error) {
      toast.error(error.message || "Unable to save haircut design.");
    } finally {
      setActionLoading("");
    }
  };

  const deleteService = async (service) => {
    const loadingKey = `service-delete-${service.id}`;
    setActionLoading(loadingKey);
    try {
      if (service.imagePublicId) {
        await deleteCloudinaryImage(service.imagePublicId);
      }
      await deleteDoc(doc(db, "services", service.id));
      setConfirmDialog(null);
      toast.success("Haircut design deleted.");
      if (editingServiceId === service.id) resetServiceForm();
    } catch (error) {
      toast.error(error.message || "Unable to delete haircut design.");
    } finally {
      setActionLoading("");
    }
  };

  const updateRefundStatus = async (refund, status) => {
    const loadingKey = `refund-${refund.id}-${status}`;
    setActionLoading(loadingKey);
    try {
      if (status === "completed") {
        if (!refund.orderId || refund.orderId === "-") {
          throw new Error("Cashfree order ID is required to process refund.");
        }

        const authHeader = await getAuthHeader();
        const response = await fetch(`${API_URL}/api/customer-payments/cashfree/refund`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader
          },
          body: JSON.stringify({
            refundRequestId: refund.id,
            bookingId: refund.bookingId,
            orderId: refund.orderId,
            amount: Number(refund.amount || 0),
            note: refund.reason || "Customer booking refund",
            adminId: user.uid,
            adminEmail: user.email || ""
          })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Cashfree refund failed.");
        }

        toast.success(
          data.alreadyProcessed
            ? "Refund was already sent to Cashfree."
            : data.status === "completed"
              ? "Cashfree refund completed."
              : data.persisted === false
                ? "Cashfree refund initiated. Saving status from admin panel."
                : "Cashfree refund initiated."
        );
        if (data.persisted === false) {
          const refundDetails = {
            refundId: data.refund?.refund_id || `refund_${refund.id}`,
            cfRefundId: data.refund?.cf_refund_id || null,
            orderId: refund.orderId,
            refundAmount: data.refund?.refund_amount || Number(refund.amount || 0),
            refundStatus: data.refund?.refund_status || null,
            refundMode: data.refund?.refund_mode || null,
            refundArn: data.refund?.refund_arn || null,
            refundSpeed: data.refund?.refund_speed || null,
            processedAt: data.refund?.processed_at || new Date().toISOString()
          };
          await updateDoc(doc(db, "refundRequests", refund.id), {
            status: data.status || "processing",
            refundDetails,
            cashfree: {
              ...refundDetails,
              raw: data.refund || null
            },
            adminId: user.uid,
            adminEmail: user.email || "",
            updatedAt: serverTimestamp()
          });
          if (refund.bookingId) {
            await updateDoc(doc(db, "customers", refund.bookingId), {
              refundStatus: data.status || "processing",
              refundId: refundDetails.refundId,
              cfRefundId: refundDetails.cfRefundId,
              refundedAmount: refundDetails.refundAmount,
              updatedAt: serverTimestamp()
            });
          }
        }
        return;
      }

      await updateDoc(doc(db, "refundRequests", refund.id), {
        status,
        adminId: user.uid,
        adminEmail: user.email || "",
        updatedAt: serverTimestamp()
      });
      if (refund.bookingId) {
        await updateDoc(doc(db, "customers", refund.bookingId), {
          refundStatus: status,
          refundRequestId: refund.id,
          updatedAt: serverTimestamp()
        });
      }
      toast.success(`Refund marked ${statusLabel(status)}.`);
    } catch (error) {
      toast.error(error.message || "Unable to update refund request.");
    } finally {
      setActionLoading("");
    }
  };

  const callNextCustomer = () => {
    const nextCustomer = activeDisplayQueue.find((item) => item.status === "waiting");
    if (!nextCustomer) {
      setNotice("No waiting customer found.");
      toast.info("No waiting customer found.");
      return;
    }
    updateCustomerStatus(nextCustomer, "in_chair");
  };

  const closeDayAndTransferBookings = async () => {
    const today = toDateInputValue(new Date());
    const tomorrow = getTomorrowDateValue();
    const tomorrowDisplayDate = getDisplayDate(tomorrow);
    const movableBookings = queueItems
      .filter(
        (item) =>
          item.bookingDate === today &&
          activeTransferStatuses.has(String(item.status || "").toLowerCase())
      )
      .sort((first, second) => sortBookingsForTurns([first, second])[0] === first ? -1 : 1);

    if (!movableBookings.length) {
      toast.info("No active bookings found for transfer or cancellation.");
      return;
    }

    setActionLoading("close-day");
    try {
      let nextToken = await getNextTokenForDate(tomorrow);
      let transferIndex = Math.max(0, nextToken - 1);

      for (const booking of movableBookings) {
        const status = String(booking.status || "").toLowerCase();
        const isOnlinePaidWaitlist =
          status === "waitlist" &&
          booking.paymentProvider === "cashfree" &&
          booking.paymentStatus === "paid";
        const shouldCancelWaitlist =
          status === "waitlist" && !isOnlinePaidWaitlist;

        if (shouldCancelWaitlist) {
          await updateDoc(doc(db, "customers", booking.id), {
            status: "cancelled",
            cancelledBy: "system_shop_closed",
            cancelledAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          continue;
        }

        const slot =
          timeSlots[Math.floor(transferIndex / STAFF_COUNT)] ||
          timeSlots[timeSlots.length - 1];

        await updateDoc(doc(db, "customers", booking.id), {
          bookingDate: tomorrow,
          bookingDay: "tomorrow",
          bookingLabel: "Tomorrow",
          bookingDisplayDate: tomorrowDisplayDate,
          timeSlot: slot?.value || "",
          timeSlotLabel: slot?.label || "",
          token: 0,
          peopleAhead: 0,
          status: "waiting",
          transferredFromDate: today,
          transferredReason: "shop_closed",
          updatedAt: serverTimestamp()
        });
        nextToken += 1;
        transferIndex += 1;
      }

      await reindexQueueDate(today);
      await reindexQueueDate(tomorrow);

      toast.success(
        "Bookings transferred to tomorrow. Non-paid waitlist bookings were cancelled."
      );
    } catch (error) {
      toast.error(error.message || "Day close transfer failed.");
    } finally {
      setActionLoading("");
    }
  };

  const exportQueue = () => {
    const headers = [
      "Token",
      "Name",
      "Mobile",
      "Service",
      "Booking Day",
      "Status",
      "Amount"
    ];
    const rows = filteredQueue.map((item) => [
      item.token,
      item.name,
      item.phone,
      item.service || "",
      item.bookingLabel || "",
      statusLabel(item.status),
      item.amount || ""
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "salon-queue.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveSalonSettings = async (event) => {
    event.preventDefault();
    setNotice("");

    setActionLoading("settings-save");
    try {
      const payload = {
        ...settingsDraft,
        ownerId: user.uid,
        ownerEmail: user.email || "",
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, "salons", user.uid), payload, { merge: true });
      setSalonProfile(payload);
      setNotice("Salon settings saved.");
      toast.success("Salon settings saved.");
    } catch (error) {
      const message = error.message || "Unable to save salon settings.";
      setNotice(message);
      toast.error(message);
    } finally {
      setActionLoading("");
    }
  };

  const toggleShopClosed = async (closed) => {
    setActionLoading("shop-status");
    try {
      const payload = {
        manualShopClosed: closed,
        manualCloseReason: closed
          ? settingsDraft.manualCloseReason || "Shop closed by owner."
          : "",
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, "salons", user.uid), payload, { merge: true });
      setSalonProfile((current) => ({ ...current, ...payload }));
      setSettingsDraft((current) => ({ ...current, ...payload }));
      toast.success(closed ? "Shop closed for booking." : "Shop opened for booking.");
    } catch (error) {
      toast.error(error.message || "Unable to update shop status.");
    } finally {
      setActionLoading("");
    }
  };

  const copyPublicLink = async () => {
    setActionLoading("copy-link");
    try {
      await navigator.clipboard.writeText(publicQueueLink);
      setNotice("Public queue link copied.");
      toast.success("Public queue link copied.");
    } catch {
      setNotice(publicQueueLink);
      toast.info("Copy failed. Link shown on screen.");
    } finally {
      setActionLoading("");
    }
  };

  const handlePremiumSubscribe = async () => {
    setSubscriptionStatus("");
    setSubscriptionLoading(true);

    try {
      await loadRazorpayCheckout();

      const salonId = user.uid;
      const ownerId = user.uid;

      setDoc(
        doc(db, "salons", salonId),
        {
          ...defaultSalonProfile,
          ...salonProfile,
          slug: salonProfile.slug || defaultSalonProfile.slug,
          ownerId,
          ownerEmail: user.email || "",
          updatedAt: serverTimestamp()
        },
        { merge: true }
      ).catch((error) => {
        toast.warning(
          error.message ||
            "Salon profile save failed, payment checkout will still continue."
        );
      });

      const order = await createSubscriptionOrder({ salonId, ownerId }).unwrap();

      if (!order?.id || !order?.key_id) {
        throw new Error("Razorpay order response is missing checkout details.");
      }

      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Santosh Salon Queue",
        description: "Premium Plan - Rs. 699/month",
        order_id: order.id,
        prefill: {
          name: user.displayName || "Salon Owner",
          email: user.email || ""
        },
        notes: {
          salonId,
          ownerId,
          plan: "premium"
        },
        theme: {
          color: "#991b1b"
        },
        handler: async (response) => {
          setSubscriptionLoading(true);
          try {
            const verification = await verifySubscriptionPayment({
              salonId,
              ownerId,
              ...response
            }).unwrap();
            const now = new Date();
            const premiumUntil = new Date(now);
            premiumUntil.setDate(premiumUntil.getDate() + 30);

            await setDoc(
              doc(db, "salons", salonId),
              {
                ...defaultSalonProfile,
                ...salonProfile,
                slug: salonProfile.slug || defaultSalonProfile.slug,
                ownerId,
                ownerEmail: user.email || "",
                plan: "premium",
                paymentStatus: "active",
                premiumEnabled: true,
                premiumUntil: premiumUntil.toISOString(),
                razorpay: {
                  source: "admin-checkout-handler",
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  amount: 699,
                  currency: "INR",
                  verifiedByServer: verification.verified === true,
                  serverSaved: verification.firestore?.saved === true,
                  updatedAt: now.toISOString()
                },
                updatedAt: serverTimestamp()
              },
              { merge: true }
            );

            setSubscriptionStatus(
              `Premium activated successfully. Valid till ${formatDateTime(premiumUntil)}.`
            );
            toast.success("Payment verified. Premium active for 30 days.");
          } catch (error) {
            const message = getRequestErrorMessage(
              error,
              "Payment verification failed."
            );
            setSubscriptionStatus(message);
            toast.error(message);
          } finally {
            setSubscriptionLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubscriptionLoading(false);
          }
        }
      });

      checkout.open();
    } catch (error) {
      const message = getRequestErrorMessage(error, "Subscription failed");
      setSubscriptionStatus(message);
      toast.error(message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  if (authLoading) {
    return <AdminLoadingScreen />;
  }

  if (!user) {
    return (
      <AdminLoginScreen
        actionLoading={actionLoading}
        authError={authError}
        onGoogleLogin={handleGoogleLogin}
      />
    );
  }

  const emailAllowed =
    user.email &&
    ADMIN_ALLOWED_EMAILS.includes(user.email.trim().toLowerCase());

  if (!emailAllowed) {
    return (
      <AdminAccessBlockedScreen
        actionLoading={actionLoading}
        onLogout={handleLogout}
        user={user}
      />
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#06100e] text-[#f4fbf8]">
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: "18px",
            border: "1px solid #35201f",
            boxShadow: "0 18px 60px rgba(18, 57, 52, 0.16)"
          }
        }}
      />
      <div className="grid h-screen overflow-hidden lg:grid-cols-[280px_1fr]">
        <aside className="hidden h-screen overflow-hidden border-r border-white/70 bg-[#081311] p-5 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f9c66d] text-[#081311]">
              <Scissors size={23} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f9c66d]">
                Owner Panel
              </p>
              <h1 className="text-xl font-black">Santosh Salon</h1>
            </div>
          </div>

          <nav className="mt-8 flex-1 space-y-2">
            {navItems.map(({ icon: Icon, label, key }) => (
              <button
                className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left font-bold transition ${
                  activePage === key
                    ? "bg-[#991b1b] text-white shadow-lg shadow-[#991b1b]/25"
                    : "text-white/72 hover:bg-white/10 hover:text-white"
                }`}
                key={key}
                onClick={() => navigateAdminPage(key)}
                type="button"
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </nav>

          <button
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/25 bg-[#24170d] font-black text-[#f9c66d] transition hover:bg-[#2a1111] disabled:opacity-60"
            disabled={actionLoading === "logout"}
            onClick={handleLogout}
            type="button"
          >
            {actionLoading === "logout" ? <ButtonSpinner dark /> : <LogOut size={18} />}
            {actionLoading === "logout" ? "Logging out..." : "Logout"}
          </button>
        </aside>

        <section className="min-w-0 overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-white/70 bg-[#06100e]/92 px-3 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white shadow-sm lg:hidden"
                  onClick={() => setMobileMenuOpen((value) => !value)}
                  type="button"
                >
                  <Menu size={20} />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#991b1b]">
                    {activeNavItem.label}
                  </p>
                  <h2 className="truncate text-lg font-black text-[#f4fbf8] sm:text-2xl">
                    {salonProfile.name || "Santosh Salon"}
                  </h2>
                </div>
                <span
                  className={`hidden rounded-full px-3 py-1 text-xs font-black sm:inline-flex ${
                    shopManuallyClosed
                      ? "bg-[#fee2e2] text-[#b91c1c]"
                      : "bg-[#2a1111] text-[#fca5a5]"
                  }`}
                >
                  {shopManuallyClosed ? "Closed" : "Open"}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm md:flex">
                  <span className="text-xs font-bold text-[#9db2ad]">Today</span>
                  <span className="font-black text-[#f4fbf8]">
                    {String(activeQueueItems.length).padStart(2, "0")}
                  </span>
                </div>
                <div className="hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm md:flex">
                  <span className="text-xs font-bold text-[#9db2ad]">Tomorrow</span>
                  <span className="font-black text-[#f4fbf8]">
                    {String(tomorrowBookingCount).padStart(2, "0")}
                  </span>
                </div>
                {activePage === "users" ? (
                  <div className="hidden min-w-[260px] items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[#9db2ad] shadow-sm sm:flex">
                    <Search size={18} />
                    <input
                      className="w-full border-0 bg-transparent outline-none"
                      onChange={(event) => setUserSearchTerm(event.target.value)}
                      placeholder="Search users"
                      value={userSearchTerm}
                    />
                  </div>
                ) : null}
                <button
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm"
                  type="button"
                >
                  <BellRing size={19} />
                </button>
                <button
                  aria-label="Owner profile"
                  className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-1 shadow-sm transition hover:bg-[#101a18]"
                  onClick={() => navigateAdminPage("settings")}
                  type="button"
                >
                  <UserAvatar size="h-9 w-9" user={user} />
                </button>
              </div>
            </div>
          </header>

          <div
            className={`fixed inset-0 z-50 lg:hidden ${
              mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            <button
              aria-label="Close menu"
              className={`absolute inset-0 bg-[#081311]/38 backdrop-blur-md transition-opacity duration-300 ${
                mobileMenuOpen ? "opacity-100" : "opacity-0"
              }`}
              onClick={() => setMobileMenuOpen(false)}
              type="button"
            />
            <aside
              className={`absolute left-0 top-0 flex h-dvh w-[86vw] max-w-sm flex-col bg-white p-4 shadow-2xl transition-transform duration-300 ease-out ${
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#991b1b] text-white">
                    <Scissors size={22} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#991b1b]">
                      Owner Panel
                    </p>
                    <p className="font-black">Santosh Salon</p>
                  </div>
                </div>
                <button
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-[#101a18]"
                  onClick={() => setMobileMenuOpen(false)}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="grid flex-1 content-start gap-2 overflow-y-auto pb-4">
                {navItems.map(({ icon: Icon, label, key }) => (
                  <button
                    className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left font-black ${
                      activePage === key
                        ? "bg-[#991b1b] text-white"
                        : "bg-[#101a18] text-[#f4fbf8]"
                    }`}
                    key={key}
                    onClick={() => {
                      navigateAdminPage(key);
                      setMobileMenuOpen(false);
                    }}
                    type="button"
                  >
                    <Icon size={19} />
                    {label}
                  </button>
                ))}
              </nav>
              <button
                className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/25 bg-[#24170d] font-black text-[#f9c66d] disabled:opacity-60"
                disabled={actionLoading === "logout"}
                onClick={handleLogout}
                type="button"
              >
                {actionLoading === "logout" ? <ButtonSpinner /> : <LogOut size={18} />}
                {actionLoading === "logout" ? "Logging out..." : "Logout"}
              </button>
            </aside>
          </div>

          <div className="px-4 py-5 sm:px-6 lg:px-8">
            {notice ? (
              <p className="mb-5 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#f4fbf8] soft-shadow">
                {notice}
              </p>
            ) : null}

            <div className={activePage === "dashboard" ? "block" : "hidden"}>
            <section className="admin-hero soft-shadow overflow-hidden rounded-[2rem] p-5 text-white sm:p-7">
              <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-[#f9c66d] ring-1 ring-white/20">
                    <Sparkles size={16} />
                    Real-time dashboard
                  </div>
                  <h2 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                    Manage tokens, staff flow, and salon rush from one screen.
                  </h2>
                  <p className="mt-4 max-w-2xl leading-7 text-white/76">
                    Call next, skip, complete, track waiting count, and share
                    public queue link with customers.
                  </p>
                </div>
                <div className="rounded-3xl bg-white/14 p-4 backdrop-blur">
                  <p className="text-sm font-bold text-white/72">
                    Public queue link
                  </p>
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-[#f4fbf8]">
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">
                      santosh-salon.web.app/q/santosh
                    </p>
                    <Copy size={18} />
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={UsersRound}
                label="Confirmed Queue"
                value={String(waitingCount).padStart(2, "0")}
                trend="Live"
                tone="bg-[#f9c66d] text-[#991b1b]"
              />
              <StatCard
                icon={PhoneCall}
                label="Haircuts In Chair"
                value={String(inChairCount).padStart(2, "0")}
                trend="Now"
                tone="bg-[#ede9fe] text-[#7c3aed]"
              />
              <StatCard
                icon={UserCheck}
                label="Completed Today"
                value={String(completedCount).padStart(2, "0")}
                trend="Done"
                tone="bg-[#2a1111] text-[#fca5a5]"
              />
              <StatCard
                icon={Clock3}
                label="Tomorrow Bookings"
                value={String(tomorrowBookingCount).padStart(2, "0")}
                trend={getDisplayDate(tomorrowQueueDate)}
                tone="bg-[#ffedd5] text-[#f97316]"
              />
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
              <article className="chart-card soft-shadow rounded-3xl bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                      Weekly queue flow
                    </p>
                    <h3 className="text-2xl font-black">Bookings vs completed</h3>
                  </div>
                  <span className="rounded-full bg-[#24170d] px-4 py-2 text-sm font-black text-[#991b1b]">
                    Last 7 days
                  </span>
                </div>
                {hasWeeklyFlow ? (
                  <div className="mt-5 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyFlowData}>
                        <defs>
                          <linearGradient id="customers" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#991b1b" stopOpacity={0.32} />
                            <stop offset="95%" stopColor="#991b1b" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="completed" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.24} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                        <XAxis dataKey="day" stroke="#70817d" />
                        <YAxis allowDecimals={false} stroke="#70817d" />
                        <Tooltip />
                        <Area
                          dataKey="bookings"
                          fill="url(#customers)"
                          stroke="#991b1b"
                          strokeWidth={3}
                          type="monotone"
                        />
                        <Area
                          dataKey="completed"
                          fill="url(#completed)"
                          stroke="#f97316"
                          strokeWidth={3}
                          type="monotone"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-5 grid h-72 place-items-center rounded-3xl bg-[#101a18] text-center">
                    <div>
                      <p className="text-3xl font-black text-[#f4fbf8]">No weekly data yet</p>
                      <p className="mt-2 text-sm font-bold text-[#9db2ad]">
                        Bookings will appear here after customers join the queue.
                      </p>
                    </div>
                  </div>
                )}
              </article>

              <article className="soft-shadow rounded-3xl bg-white p-4 sm:p-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Today money
                </p>
                <h3 className="mt-1 text-2xl font-black">Revenue, refund, net</h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {dashboardSummary.map((item) => (
                    <div
                      className="flex items-center justify-between rounded-2xl bg-[#101a18] px-4 py-3"
                      key={item.label}
                    >
                      <span className="text-sm font-bold text-[#9db2ad]">
                        {item.label}
                      </span>
                      <span className="font-black text-[#f4fbf8]">{item.value}</span>
                    </div>
                  ))}
                </div>
                {hasRevenueChart ? (
                  <div className="mt-5 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChartData}>
                        <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                        <XAxis dataKey="day" stroke="#70817d" />
                        <YAxis stroke="#70817d" />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#991b1b" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="refunds" fill="#dc2626" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="net" fill="#f9c66d" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-5 grid h-48 place-items-center rounded-3xl bg-[#101a18] text-center text-sm font-bold text-[#9db2ad]">
                    Revenue chart will appear after paid or completed bookings.
                  </div>
                )}
              </article>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <article className="soft-shadow rounded-3xl bg-white p-4 sm:p-6">
                <h3 className="text-2xl font-black">Service split</h3>
                {hasServiceSplit ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            cx="50%"
                            cy="50%"
                            data={serviceSplitData}
                            dataKey="value"
                            innerRadius={48}
                            outerRadius={78}
                            paddingAngle={4}
                          >
                            {serviceSplitData.map((item) => (
                              <Cell fill={item.color} key={item.name} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {serviceSplitData.map((item) => (
                        <div
                          className="flex items-center justify-between rounded-2xl bg-[#101a18] px-4 py-3"
                          key={item.name}
                        >
                          <span className="flex items-center gap-2 font-bold">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ background: item.color }}
                            />
                            {item.name}
                          </span>
                          <span className="font-black">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ChartEmpty
                    className="mt-4 h-48"
                    text="Service usage will appear after customers book haircuts."
                    title="No service data yet"
                  />
                )}
              </article>

              <article className="chart-card soft-shadow rounded-3xl bg-white p-4 sm:p-6">
                <h3 className="text-2xl font-black">Hourly bookings today</h3>
                {hasHourlyRush ? (
                  <div className="mt-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyRushData}>
                        <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                        <XAxis dataKey="time" stroke="#70817d" />
                        <YAxis allowDecimals={false} stroke="#70817d" />
                        <Tooltip />
                        <Bar dataKey="bookings" fill="#991b1b" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty
                    className="mt-4 h-48"
                    text="Today slot-wise bookings will show here."
                    title="No hourly rush yet"
                  />
                )}
              </article>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-2">
              <article className="soft-shadow rounded-3xl bg-white p-4 sm:p-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Queue health
                </p>
                <h3 className="mt-1 text-2xl font-black">Status mix today</h3>
                {hasQueueStatus ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-[170px_1fr] sm:items-center xl:grid-cols-1">
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            cx="50%"
                            cy="50%"
                            data={queueStatusChartData}
                            dataKey="value"
                            innerRadius={42}
                            outerRadius={72}
                            paddingAngle={4}
                          >
                            {queueStatusChartData.map((item) => (
                              <Cell fill={item.color} key={item.name} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid gap-2">
                      {queueStatusChartData.map((item) => (
                        <div
                          className="flex items-center justify-between rounded-2xl bg-[#101a18] px-3 py-2 text-sm"
                          key={item.name}
                        >
                          <span className="flex items-center gap-2 font-bold">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: item.color }}
                            />
                            {item.name}
                          </span>
                          <span className="font-black">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ChartEmpty
                    className="mt-4 h-44"
                    text="Queue status data will show after bookings start."
                    title="No queue status yet"
                  />
                )}
              </article>

              <article className="soft-shadow rounded-3xl bg-white p-4 sm:p-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Payments
                </p>
                <h3 className="mt-1 text-2xl font-black">Payment methods</h3>
                {hasPaymentMethods ? (
                  <div className="mt-4 h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentMethodChartData} layout="vertical">
                        <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                        <XAxis allowDecimals={false} stroke="#70817d" type="number" />
                        <YAxis dataKey="name" stroke="#70817d" type="category" width={110} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#991b1b" radius={[0, 12, 12, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty
                    className="mt-4 h-60"
                    text="Cashfree, COD, and admin-created booking mix will show here."
                    title="No payment data yet"
                  />
                )}
              </article>

              <article className="soft-shadow rounded-3xl bg-white p-4 sm:p-6 xl:col-span-2">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Refunds
                </p>
                <h3 className="mt-1 text-2xl font-black">Refund status</h3>
                {hasRefundStatuses ? (
                  <div className="mt-4 h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={refundStatusChartData}>
                        <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#70817d" />
                        <YAxis allowDecimals={false} stroke="#70817d" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#dc2626" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty
                    className="mt-4 h-60"
                    text="Requested, processing, completed, and rejected refunds will show here."
                    title="No refund requests yet"
                  />
                )}
              </article>
            </section>

            <section className="soft-shadow mt-5 grid gap-4 rounded-3xl bg-white p-4 sm:p-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <div className="rounded-3xl bg-[#101a18] p-5">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Now serving
                </p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-5xl font-black text-[#f4fbf8]">
                      {currentCustomer?.token || "-"}
                    </p>
                    <p className="mt-2 font-bold text-[#9db2ad]">
                      {currentCustomer?.name || "No active customer"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#2a1111] px-4 py-2 text-sm font-black text-[#fca5a5]">
                    {currentCustomer ? statusLabel(currentCustomer.status) : "Idle"}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 font-black text-white shadow-lg shadow-[#991b1b]/20 disabled:opacity-60"
                  disabled={actionLoading.startsWith("customer-")}
                  onClick={callNextCustomer}
                  type="button"
                >
                  {actionLoading.startsWith("customer-") ? <ButtonSpinner /> : <PhoneCall size={19} />}
                  Call Next
                </button>
                <button
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#fff7ed] px-5 font-black text-[#c2410c] disabled:opacity-60"
                  disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-skipped`}
                  onClick={() => updateCustomerStatus(currentCustomer, "skipped")}
                  type="button"
                >
                  {actionLoading === `customer-${currentCustomer?.id}-skipped` ? <ButtonSpinner dark /> : <SkipForward size={19} />}
                  Skip
                </button>
                <button
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#2a1111] px-5 font-black text-[#fca5a5] disabled:opacity-60"
                  disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-completed`}
                  onClick={() => updateCustomerStatus(currentCustomer, "completed")}
                  type="button"
                >
                  {actionLoading === `customer-${currentCustomer?.id}-completed` ? <ButtonSpinner dark /> : <CheckCircle2 size={19} />}
                  Complete
                </button>
              </div>
            </section>

            </div>

            {activePage === "queue" ? (
              <section className="soft-shadow overflow-hidden rounded-3xl bg-white">
                <div className="grid gap-4 border-b border-[#35201f] p-4 sm:p-6 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                      Queue
                    </p>
                    <h2 className="text-3xl font-black">Live customers</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#081311] px-4 font-black text-white"
                      onClick={exportQueue}
                      type="button"
                    >
                      <Download size={18} />
                      Export
                    </button>
                    <button
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-4 font-black text-white"
                      onClick={openAdminBookingDialog}
                      type="button"
                    >
                      <UserCheck size={18} />
                      Add Booking
                    </button>
                    <button
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#fff7ed] px-4 font-black text-[#c2410c] disabled:opacity-60"
                      disabled={actionLoading === "close-day"}
                      onClick={closeDayAndTransferBookings}
                      type="button"
                    >
                      {actionLoading === "close-day" ? <ButtonSpinner dark /> : <XCircle size={18} />}
                      Close Day
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
                  <div className="rounded-3xl bg-[#101a18] p-4 lg:col-span-2">
                    <p className="text-sm font-bold text-[#9db2ad]">
                      Today active bookings
                    </p>
                    <p className="mt-1 text-3xl font-black text-[#f4fbf8]">
                      {String(activeQueueItems.length).padStart(2, "0")}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#fff7ed] p-4 lg:col-span-2">
                    <p className="text-sm font-bold text-[#9a3412]">
                      Tomorrow bookings
                    </p>
                    <p className="mt-1 text-3xl font-black text-[#f4fbf8]">
                      {String(tomorrowBookingCount).padStart(2, "0")}
                    </p>
                    <p className="mt-1 text-xs font-black text-[#9a3412]">
                      {getDisplayDate(tomorrowQueueDate)}
                    </p>
                  </div>
                </div>

                <div className="mx-4 mt-2 grid gap-4 rounded-3xl bg-[#101a18] p-3 sm:mx-6 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#991b1b]">
                      Queue status
                    </p>
                    <p className="text-xs font-bold text-[#9db2ad]">
                      {selectedQueueTab.label} view
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                    {queueStatusTabs.map((tab) => {
                      const count = todaysQueueItems.filter((item) =>
                        tab.statuses.includes(
                          String(item.status || "").toLowerCase()
                        )
                      ).length;
                      const active = queueStatusTab === tab.key;

                      return (
                        <button
                          className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black transition sm:text-base ${
                            active
                              ? "bg-[#991b1b] text-white shadow-lg shadow-[#991b1b]/15"
                              : "bg-white text-[#f4fbf8] hover:bg-[#24170d]"
                          }`}
                          key={tab.key}
                          onClick={() => setQueueStatusTab(tab.key)}
                          type="button"
                        >
                          <span className="truncate">{tab.label}</span>
                          <span
                            className={`grid h-6 min-w-6 place-items-center rounded-full px-2 text-xs ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-[#24170d] text-[#991b1b]"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mx-4 mt-4 rounded-3xl bg-white p-3 ring-1 ring-[#35201f] sm:mx-6 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#991b1b]">
                      Current controls
                    </p>
                    <p className="text-xs font-bold text-[#9db2ad]">
                      Token {currentCustomer?.token || "-"}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 font-black text-white shadow-lg shadow-[#991b1b]/15 disabled:opacity-60"
                      disabled={actionLoading.startsWith("customer-")}
                      onClick={callNextCustomer}
                      type="button"
                    >
                      {actionLoading.startsWith("customer-") ? <ButtonSpinner /> : <PhoneCall size={19} />}
                      Call
                    </button>
                    <button
                      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#fff7ed] px-5 font-black text-[#c2410c] disabled:opacity-60"
                      disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-skipped`}
                      onClick={() => updateCustomerStatus(currentCustomer, "skipped")}
                      type="button"
                    >
                      {actionLoading === `customer-${currentCustomer?.id}-skipped` ? <ButtonSpinner dark /> : <SkipForward size={19} />}
                      Skip
                    </button>
                    <button
                      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#2a1111] px-5 font-black text-[#fca5a5] disabled:opacity-60"
                      disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-completed`}
                      onClick={() => updateCustomerStatus(currentCustomer, "completed")}
                      type="button"
                    >
                      {actionLoading === `customer-${currentCustomer?.id}-completed` ? <ButtonSpinner dark /> : <CheckCircle2 size={19} />}
                      Complete
                    </button>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto px-4 pb-5 sm:px-6">
                  <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
                    <colgroup>
                      <col className="w-[76px]" />
                      <col className="w-[150px]" />
                      <col className="w-[125px]" />
                      <col className="w-[150px]" />
                      <col className="w-[125px]" />
                      <col className="w-[110px]" />
                      <col className="w-[120px]" />
                      <col className="w-[120px]" />
                      <col className="w-[340px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#101a18] text-sm text-[#9db2ad]">
                        <th className="px-5 py-4">Token</th>
                        <th className="px-5 py-4">Customer</th>
                        <th className="px-5 py-4">Mobile</th>
                        <th className="px-5 py-4">Service</th>
                        <th className="px-5 py-4">Booking</th>
                        <th className="px-5 py-4">Slot</th>
                        <th className="px-5 py-4">Payment</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedQueue.map((customer) => (
                        <tr className="border-t border-[#35201f]" key={customer.id || customer.token}>
                          <td className="px-5 py-4 text-xl font-black">{customer.token}</td>
                          <td className="px-5 py-4 font-bold">{customer.name}</td>
                          <td className="px-5 py-4 text-[#9db2ad]">{customer.phone}</td>
                          <td className="px-5 py-4 text-[#9db2ad]">{customer.service}</td>
                          <td className="px-5 py-4 text-sm font-bold text-[#991b1b]">
                            {customer.bookingLabel}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-[#f4fbf8]">
                            {customer.timeSlotLabel || customer.timeSlot || "-"}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-[#9db2ad]">
                            {statusLabel(customer.paymentStatus)}
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex h-8 min-w-24 items-center justify-center rounded-full bg-[#24170d] px-3 text-xs font-black text-[#991b1b]">
                              {statusLabel(customer.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="grid grid-cols-[56px_56px_62px_56px_66px] gap-2">
                              <button
                                className="grid h-11 place-items-center rounded-xl bg-[#2a1111] px-2 text-xs font-black text-[#fca5a5] disabled:opacity-60"
                                disabled={
                                  String(customer.status || "").toLowerCase() !==
                                    "waiting" ||
                                  actionLoading === `customer-${customer.id}-in_chair`
                                }
                                onClick={() => updateCustomerStatus(customer, "in_chair")}
                                type="button"
                              >
                                {actionLoading === `customer-${customer.id}-in_chair` ? <ButtonSpinner dark /> : "Call"}
                              </button>
                              <button
                                className="grid h-11 place-items-center rounded-xl bg-[#fff7ed] px-2 text-xs font-black text-[#c2410c] disabled:opacity-60"
                                disabled={
                                  !["waiting", "in_chair"].includes(
                                    String(customer.status || "").toLowerCase()
                                  ) ||
                                  actionLoading === `customer-${customer.id}-skipped`
                                }
                                onClick={() => updateCustomerStatus(customer, "skipped")}
                                type="button"
                              >
                                {actionLoading === `customer-${customer.id}-skipped` ? <ButtonSpinner dark /> : "Skip"}
                              </button>
                              <button
                                className="grid h-11 place-items-center rounded-xl bg-[#24170d] px-2 text-xs font-black text-[#f9c66d] disabled:opacity-60"
                                disabled={
                                  !["waiting", "in_chair"].includes(
                                    String(customer.status || "").toLowerCase()
                                  ) ||
                                  actionLoading === `customer-${customer.id}-completed`
                                }
                                onClick={() => updateCustomerStatus(customer, "completed")}
                                type="button"
                              >
                                {actionLoading === `customer-${customer.id}-completed` ? <ButtonSpinner dark /> : "Done"}
                              </button>
                              <button
                                className="grid h-11 place-items-center rounded-xl bg-[#101a18] px-2 text-xs font-black text-[#f4fbf8]"
                                onClick={() => openBookingEditor(customer)}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                className="grid h-11 place-items-center rounded-xl bg-[#fee2e2] px-2 text-xs font-black text-[#b91c1c] disabled:opacity-60"
                                disabled={actionLoading === `booking-delete-${customer.id}`}
                                onClick={() =>
                                  setConfirmDialog({
                                    title: "Delete booking?",
                                    message: `Token ${customer.token} for ${customer.name} will be permanently deleted.`,
                                    confirmLabel: "Delete",
                                    loadingKey: `booking-delete-${customer.id}`,
                                    onConfirm: () => deleteBooking(customer)
                                  })
                                }
                                type="button"
                              >
                                {actionLoading === `booking-delete-${customer.id}` ? <ButtonSpinner dark /> : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationControls
                    onPageChange={setQueuePage}
                    page={safeQueuePage}
                    totalPages={queueTotalPages}
                  />
                  {queueLoading ? (
                    <p className="p-5 text-sm font-bold text-[#9db2ad]">Loading queue...</p>
                  ) : null}
                  {!queueLoading && !filteredQueue.length ? (
                    <p className="p-5 text-sm font-bold text-[#9db2ad]">
                      No {selectedQueueTab.label.toLowerCase()} bookings found for today.
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {activePage === "services" ? (
              <section className="soft-shadow rounded-3xl bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                        Services
                      </p>
                      <h2 className="mt-1 text-3xl font-black">
                        Website service cards
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm font-bold text-[#9db2ad]">
                        These cards appear live on the client website. Images
                        are uploaded to Cloudinary from the Add/Edit dialog.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-[#24170d] px-4 py-2 text-sm font-black text-[#991b1b]">
                        {serviceItems.length} items
                      </span>
                      <button
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#081311] px-5 py-3 font-black text-white"
                        onClick={openAddServiceDialog}
                        type="button"
                      >
                        <ImagePlus size={18} />
                        Add Service
                      </button>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {paginatedServices.map((service) => (
                      <article
                        className="overflow-hidden rounded-3xl border border-[#35201f] bg-white shadow-sm"
                        key={service.id}
                      >
                        {service.imageUrl ? (
                          <img
                            alt={service.title}
                            className="h-44 w-full object-cover"
                            src={service.imageUrl}
                          />
                        ) : (
                          <div className="grid h-44 place-items-center bg-[#101a18] text-[#991b1b]">
                            <ImagePlus size={30} />
                          </div>
                        )}
                        <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-black">{service.title}</h3>
                            <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                              {service.time} • {service.price}
                            </p>
                            <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-[#991b1b]">
                              {service.active ? "Visible" : "Hidden"}
                            </p>
                          </div>
                        </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#101a18] text-sm font-black text-[#f4fbf8]"
                              onClick={() => editService(service)}
                              type="button"
                            >
                              <Edit size={17} />
                              Edit
                            </button>
                            <button
                              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#fee2e2] text-sm font-black text-[#b91c1c] disabled:opacity-60"
                              disabled={actionLoading === `service-delete-${service.id}`}
                              onClick={() =>
                                setConfirmDialog({
                                  title: "Delete service?",
                                  message: `${service.title} will be removed from the client website and its Cloudinary image will also be deleted.`,
                                  confirmLabel: "Delete",
                                  loadingKey: `service-delete-${service.id}`,
                                  onConfirm: () => deleteService(service)
                                })
                              }
                              type="button"
                            >
                              {actionLoading === `service-delete-${service.id}` ? (
                                <ButtonSpinner dark />
                              ) : (
                                <Trash2 size={17} />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!serviceItems.length ? (
                    <p className="mt-5 rounded-2xl bg-[#101a18] p-4 text-sm font-bold text-[#9db2ad]">
                      No custom haircut designs yet.
                    </p>
                  ) : null}
                  <PaginationControls
                    onPageChange={setServicePage}
                    page={safeServicePage}
                    totalPages={serviceTotalPages}
                  />
              </section>
            ) : null}

            {activePage === "refunds" ? (
              <section className="soft-shadow rounded-3xl bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                      Refunds
                    </p>
                    <h2 className="mt-1 text-3xl font-black">
                      Customer refund requests
                    </h2>
                    <p className="mt-2 text-sm font-bold text-[#9db2ad]">
                      Review payment id/order id, then process the eligible service amount refund to the original payment method. Cashfree charges are non-refundable.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#24170d] px-4 py-2 text-sm font-black text-[#991b1b]">
                    {refundRequests.length} requests
                  </span>
                </div>

                <div className="mt-5 overflow-x-auto rounded-2xl">
                  <table className="min-w-[1180px] w-full text-left">
                    <thead className="bg-[#101a18] text-sm font-black text-[#9db2ad]">
                      <tr>
                        {[
                          "Customer",
                          "Mobile",
                          "Amount",
                          "Payment ID",
                          "Order ID",
                          "Status",
                          "Actions"
                        ].map((heading) => (
                          <th className="px-5 py-4" key={heading}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRefunds.map((refund) => (
                        <tr className="border-b border-[#35201f]" key={refund.id}>
                          <td className="px-5 py-5">
                            <p className="font-black text-[#f4fbf8]">{refund.customerName}</p>
                            <p className="mt-1 text-xs font-bold text-[#9db2ad]">
                              {refund.customerEmail}
                            </p>
                            {Number(refund.bookingGroupSize || 1) > 1 ? (
                              <p className="mt-1 text-xs font-black text-[#c2410c]">
                                Partial refund: person {refund.bookingGroupIndex}/
                                {refund.bookingGroupSize}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-5 font-bold text-[#52625f]">
                            {refund.customerMobile}
                          </td>
                          <td className="px-5 py-5 font-black text-[#991b1b]">
                            Rs. {Number(refund.amount || 0).toFixed(2)}
                            {Number(refund.cashfreeFee || 0) > 0 ? (
                              <p className="mt-1 text-xs font-bold text-[#c2410c]">
                                Fee not refunded: Rs.{" "}
                                {Number(refund.cashfreeFee || 0).toFixed(2)}
                              </p>
                            ) : null}
                          </td>
                          <td className="max-w-[180px] break-words px-5 py-5 font-black text-[#f4fbf8]">
                            {refund.paymentId || "-"}
                          </td>
                          <td className="max-w-[220px] break-words px-5 py-5 font-black text-[#f4fbf8]">
                            {refund.orderId || "-"}
                          </td>
                          <td className="px-5 py-5">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                refund.status === "completed"
                                  ? "bg-[#2a1111] text-[#fca5a5]"
                                  : ["rejected", "failed"].includes(refund.status)
                                    ? "bg-[#fee2e2] text-[#b91c1c]"
                                    : refund.status === "processing"
                                      ? "bg-[#24170d] text-[#0369a1]"
                                      : "bg-[#fff7ed] text-[#c2410c]"
                              }`}
                            >
                              {statusLabel(refund.status)}
                            </span>
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex min-w-max items-center gap-2">
                              {[
                                ["reviewing", "Review"],
                                ["processing", "Processing"],
                                ["completed", "Refund"],
                                ["rejected", "Reject"]
                              ].map(([status, label]) => (
                                <button
                                  className={`flex min-h-10 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black disabled:opacity-60 ${
                                    status === "rejected"
                                      ? "bg-[#fee2e2] text-[#b91c1c]"
                                      : status === "completed"
                                        ? "bg-[#2a1111] text-[#fca5a5]"
                                        : "bg-[#101a18] text-[#f4fbf8]"
                                  }`}
                                  disabled={actionLoading === `refund-${refund.id}-${status}`}
                                  key={status}
                                  onClick={() => updateRefundStatus(refund, status)}
                                  type="button"
                                >
                                  {actionLoading === `refund-${refund.id}-${status}` ? (
                                    <ButtonSpinner dark />
                                  ) : null}
                                  {label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!refundsLoading && !paginatedRefunds.length ? (
                        <tr>
                          <td
                            className="px-5 py-7 font-bold text-[#9db2ad]"
                            colSpan={7}
                          >
                            No refund requests yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {refundsLoading ? (
                  <p className="mt-5 rounded-2xl bg-[#101a18] p-4 text-sm font-bold text-[#9db2ad]">
                    Loading refund requests...
                  </p>
                ) : null}
                <PaginationControls
                  onPageChange={setRefundPage}
                  page={safeRefundPage}
                  totalPages={refundTotalPages}
                />
              </section>
            ) : null}

            {activePage === "users" ? (
              <UsersPage
                filteredUsers={filteredUsers}
                googleUsers={googleUsers}
                paginatedUsers={paginatedUsers}
                registeredUsers={registeredUsers}
                safeUsersPage={safeUsersPage}
                setUserSearchTerm={setUserSearchTerm}
                setUsersPage={setUsersPage}
                userSearchTerm={userSearchTerm}
                usersLoading={usersLoading}
                usersTotalPages={usersTotalPages}
                usersWithPhone={usersWithPhone}
              />
            ) : null}
            {activePage === "public-link" ? (
              <PublicLinkPage
                actionLoading={actionLoading}
                copyPublicLink={copyPublicLink}
                publicQueueLink={publicQueueLink}
              />
            ) : null}

            {activePage === "plans" ? (
              <PlansPage
                formatDateTime={formatDateTime}
                handlePremiumSubscribe={handlePremiumSubscribe}
                premiumActive={premiumActive}
                premiumUntilDate={premiumUntilDate}
                salonProfile={salonProfile}
                subscriptionLoading={subscriptionLoading}
                subscriptionStatus={subscriptionStatus}
              />
            ) : null}

            {activePage === "settings" ? (
              <SettingsPage
                actionLoading={actionLoading}
                onSave={saveSalonSettings}
                setSettingsDraft={setSettingsDraft}
                settingsDraft={settingsDraft}
                toggleShopClosed={toggleShopClosed}
              />
            ) : null}
          </div>
        </section>
      </div>      <ServiceDialog
        actionLoading={actionLoading}
        draft={serviceDraft}
        editingServiceId={editingServiceId}
        onClose={resetServiceForm}
        onDraftChange={setServiceDraft}
        onImageChange={handleServiceImageChange}
        onSubmit={saveService}
        open={serviceDialogOpen}
      />
      <BookingDialog
        actionLoading={actionLoading}
        bookingDateValue={adminBookingDateValue}
        draft={bookingDraft}
        mode={adminBookingMode ? "create" : "edit"}
        onClose={() => {
          setEditingBookingId("");
          setAdminBookingMode(false);
          setBookingDraft(null);
        }}
        onDateChange={(nextDate) => {
          const nextSlots = getAdminBookableSlots(nextDate);
          setBookingDraft((value) => ({
            ...value,
            bookingDate: nextDate,
            timeSlot: nextSlots.some((slot) => slot.value === value.timeSlot)
              ? value.timeSlot
              : nextSlots[0]?.value || ""
          }));
        }}
        onDraftChange={setBookingDraft}
        onSubmit={saveBookingEdit}
        open={Boolean(bookingDraft)}
        serviceItems={serviceItems}
        timeSlotValue={adminBookingTimeSlotValue}
        timeSlots={adminBookingSlots}
        todayDateValue={todayDateValue}
      />      {confirmDialog ? (
        <ConfirmDialog
          confirmLabel={confirmDialog.confirmLabel}
          loading={actionLoading === confirmDialog.loadingKey}
          message={confirmDialog.message}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          tone="danger"
        />
      ) : null}
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
