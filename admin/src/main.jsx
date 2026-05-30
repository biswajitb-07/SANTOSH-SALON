import React from "react";
import { useEffect, useState } from "react";
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
  ExternalLink,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  PhoneCall,
  QrCode,
  Save,
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

const trafficData = [
  { day: "Mon", customers: 44, completed: 38 },
  { day: "Tue", customers: 52, completed: 46 },
  { day: "Wed", customers: 39, completed: 35 },
  { day: "Thu", customers: 61, completed: 54 },
  { day: "Fri", customers: 74, completed: 67 },
  { day: "Sat", customers: 96, completed: 85 },
  { day: "Sun", customers: 68, completed: 60 }
];

const serviceData = [
  { name: "Haircut", value: 46, color: "#0f766e" },
  { name: "Shave", value: 22, color: "#f97316" },
  { name: "Facial", value: 18, color: "#0ea5e9" },
  { name: "Color", value: 14, color: "#eab308" }
];

const hourlyData = [
  { time: "10", wait: 8 },
  { time: "12", wait: 15 },
  { time: "2", wait: 22 },
  { time: "4", wait: 18 },
  { time: "6", wait: 31 },
  { time: "8", wait: 16 }
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
    paymentProvider: data.paymentProvider || "-",
    paymentStatus: data.paymentStatus || "-",
    userId: data.userId || "",
    email: data.email || data.customerEmail || "",
    createdAt: data.createdAt
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

  return {
    id: snapshotDoc.id,
    customerName: data.customerName || "Customer",
    customerEmail: data.customerEmail || "-",
    customerMobile: data.customerMobile || "-",
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
    expectedWindow: data.expectedWindow || "3-5 business days",
    refundDetails: data.refundDetails || null,
    cashfree: data.cashfree || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
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

const getUserPhotoUrl = (user) =>
  user?.photoURL ||
  user?.providerData?.find((provider) => provider?.photoURL)?.photoURL ||
  "";

function UserAvatar({ user, size = "h-10 w-10" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const photoUrl = getUserPhotoUrl(user);
  const initial =
    user?.displayName?.trim()?.charAt(0) ||
    user?.email?.trim()?.charAt(0) ||
    "O";

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

function StatCard({ icon: Icon, label, value, trend, tone }) {
  return (
    <article className="soft-shadow rounded-3xl bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}>
          <Icon size={22} />
        </span>
        <span className="rounded-full bg-[#eef8f5] px-3 py-1 text-xs font-black text-[#0f766e]">
          {trend}
        </span>
      </div>
      <p className="mt-5 text-sm font-bold text-[#6b7b78]">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
    </article>
  );
}

function PaginationControls({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
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
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#102b28]/70 px-4 py-6 backdrop-blur-sm">
      <div className="soft-shadow w-full max-w-md rounded-3xl bg-white p-5 sm:p-6">
        <h2 className="text-2xl font-black text-[#173734]">{title}</h2>
        <p className="mt-3 leading-7 text-[#6b7b78]">{message}</p>
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

function App() {
  const [createSubscriptionOrder] = useCreateSubscriptionOrderMutation();
  const [verifySubscriptionPayment] = useVerifySubscriptionPaymentMutation();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [activePage, setActivePage] = useState(() => getAdminRoute());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queueItems, setQueueItems] = useState([]);
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

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    writeAdminRoute(activePage, true);

    const syncRoute = () => {
      setActivePage(getAdminRoute());
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

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
        const nextQueue = snapshot.docs
          .map((snapshotDoc) => normalizeCustomer(snapshotDoc))
          .sort((first, second) => {
            const firstDate = first.bookingDate || "";
            const secondDate = second.bookingDate || "";
            if (firstDate !== secondDate) {
              return firstDate.localeCompare(secondDate);
            }

            const firstTime = first.createdAt?.getTime?.() || 0;
            const secondTime = second.createdAt?.getTime?.() || 0;
            if (firstTime !== secondTime) return firstTime - secondTime;

            return Number(first.token || 0) - Number(second.token || 0);
          });
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
  const completedCount = todaysQueueItems.filter(
    (item) => item.status === "completed"
  ).length;
  const tomorrowBookingCount = tomorrowQueueItems.filter((item) =>
    ["waiting", "waitlist", "in_chair"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;
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
        const token = await getNextTokenForDate(bookingDate);

        await addDoc(collection(db, "customers"), {
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
          token,
          status: selectedStatus,
          amount: Number(bookingDraft.amount || 0),
          payableAmount: Number(bookingDraft.amount || 0),
          paymentProvider: "admin",
          paymentStatus: "admin_created",
          userId: matchedUser.id,
          source: "admin-booking",
          arrivalNote:
            "Please reach the salon 40 minutes before your turn for a quicker haircut. Cancel your booking if you cannot visit.",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        setAdminBookingMode(false);
        setBookingDraft(null);
        toast.success("Admin booking created.");
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
    const response = await fetch(`${API_URL}/api/cloudinary/service-image/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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

    const response = await fetch(`${API_URL}/api/cloudinary/service-image/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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

        const response = await fetch(`${API_URL}/api/customer-payments/cashfree/refund`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
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
      .sort((first, second) => Number(first.storedToken) - Number(second.storedToken));

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
          token: nextToken,
          status: "waiting",
          transferredFromDate: today,
          transferredReason: "shop_closed",
          updatedAt: serverTimestamp()
        });
        nextToken += 1;
        transferIndex += 1;
      }

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
          color: "#0f766e"
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
    return (
      <main className="grid min-h-screen place-items-center bg-[#eef5f1] px-4">
        <div className="soft-shadow rounded-3xl bg-white p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ccfbf1] text-[#0f766e]">
            <Scissors size={26} />
          </span>
          <p className="mt-4 font-black">Checking login...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#eef5f1] px-4 py-6 sm:px-6 lg:grid lg:place-items-center lg:px-8">
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
        <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white soft-shadow lg:min-h-[680px] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="admin-hero relative flex min-h-[360px] overflow-hidden p-6 text-white sm:p-8 lg:min-h-full lg:flex-col lg:justify-between">
            <div className="relative z-10 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f9c66d] text-[#102b28]">
                <Scissors size={23} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a7f3d0]">
                  Salon SaaS
                </p>
                <h1 className="text-xl font-black">Santosh Salon Queue</h1>
              </div>
            </div>
            <div className="relative z-10 mt-auto max-w-2xl pt-20 lg:pt-0">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-[#ccfbf1] ring-1 ring-white/20">
                <Sparkles size={16} />
                Google owner login
              </p>
              <h2 className="max-w-xl text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl">
                Run your salon queue from one clean dashboard.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/78 sm:text-lg">
                Secure Google sign-in, live tokens, queue controls, and premium
                analytics in one responsive admin panel.
              </p>
            </div>
          </section>

          <section className="flex items-center justify-center bg-white p-5 sm:p-8 lg:p-10">
            <div className="w-full max-w-md">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#102b28] text-white">
                <Scissors size={22} />
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                  Admin Login
                </p>
                <h1 className="text-2xl font-black">Santosh Salon</h1>
              </div>
            </div>

            <div className="mt-8 rounded-3xl bg-[#f6faf8] p-5">
              <h2 className="text-3xl font-black leading-tight">
                Continue with Google
              </h2>
              <p className="mt-3 leading-7 text-[#647571]">
                Only Google login is enabled for owner dashboard access.
              </p>
            </div>

            {authError ? (
              <p className="mt-4 rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm font-bold text-[#b91c1c]">
                {authError}
              </p>
            ) : null}

            <button
              className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#dbe8e3] bg-white px-5 font-black text-[#17201f] shadow-sm transition hover:border-[#0f766e] hover:bg-[#f6faf8] disabled:opacity-60"
              disabled={actionLoading === "login"}
              onClick={handleGoogleLogin}
              type="button"
            >
              {actionLoading === "login" ? (
                <ButtonSpinner dark />
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f2f5f4] text-lg font-black text-[#0f766e]">
                  G
                </span>
              )}
              {actionLoading === "login" ? "Signing in..." : "Sign in with Google"}
            </button>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#ecfdf5] p-4 text-sm font-bold text-[#166534]">
              <CheckCircle2 size={18} />
              No password, mobile OTP, or email login option.
            </div>
          </div>
          </section>
        </div>
      </main>
    );
  }

  const emailAllowed =
    user.email &&
    ADMIN_ALLOWED_EMAILS.includes(user.email.trim().toLowerCase());

  if (!emailAllowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#eef5f1] px-4">
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
        <section className="soft-shadow w-full max-w-md rounded-[2rem] bg-white p-6 text-center sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fee2e2] text-[#b91c1c]">
            <XCircle size={26} />
          </span>
          <h1 className="mt-5 text-3xl font-black">Admin access blocked</h1>
          <p className="mt-3 leading-7 text-[#647571]">
            This Google account is not allowed for the salon owner dashboard.
            Add the owner email in <strong>admin/.env</strong>.
          </p>
          <p className="mt-4 rounded-2xl bg-[#f6faf8] px-4 py-3 text-sm font-bold text-[#173734]">
            Signed in as: {user.email}
          </p>
          <button
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#102b28] font-black text-white disabled:opacity-60"
            disabled={actionLoading === "logout"}
            onClick={handleLogout}
            type="button"
          >
            {actionLoading === "logout" ? <ButtonSpinner /> : <LogOut size={18} />}
            {actionLoading === "logout" ? "Logging out..." : "Logout"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#eef5f1] text-[#17201f]">
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
      <div className="grid h-screen overflow-hidden lg:grid-cols-[280px_1fr]">
        <aside className="hidden h-screen overflow-hidden border-r border-white/70 bg-[#102b28] p-5 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f9c66d] text-[#102b28]">
              <Scissors size={23} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a7f3d0]">
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
                    ? "bg-white text-[#102b28]"
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
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-black text-[#102b28] transition hover:bg-[#f6faf8] disabled:opacity-60"
            disabled={actionLoading === "logout"}
            onClick={handleLogout}
            type="button"
          >
            {actionLoading === "logout" ? <ButtonSpinner dark /> : <LogOut size={18} />}
            {actionLoading === "logout" ? "Logging out..." : "Logout"}
          </button>
        </aside>

        <section className="min-w-0 overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-white/70 bg-[#eef5f1]/92 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm lg:hidden"
                  onClick={() => setMobileMenuOpen((value) => !value)}
                  type="button"
                >
                  <Menu size={20} />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
                    {activeNavItem.label}
                  </p>
                  <h2 className="truncate text-xl font-black text-[#173734] sm:text-2xl">
                    {salonProfile.name || "Santosh Salon"}
                  </h2>
                </div>
                <span
                  className={`hidden rounded-full px-3 py-1 text-xs font-black sm:inline-flex ${
                    shopManuallyClosed
                      ? "bg-[#fee2e2] text-[#b91c1c]"
                      : "bg-[#dcfce7] text-[#166534]"
                  }`}
                >
                  {shopManuallyClosed ? "Closed" : "Open"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <div className="hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm md:flex">
                  <span className="text-xs font-bold text-[#6b7b78]">Today</span>
                  <span className="font-black text-[#173734]">
                    {String(activeQueueItems.length).padStart(2, "0")}
                  </span>
                </div>
                <div className="hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm md:flex">
                  <span className="text-xs font-bold text-[#6b7b78]">Tomorrow</span>
                  <span className="font-black text-[#173734]">
                    {String(tomorrowBookingCount).padStart(2, "0")}
                  </span>
                </div>
                {activePage === "users" ? (
                  <div className="hidden min-w-[260px] items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[#6b7b78] shadow-sm sm:flex">
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
                  className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-1 shadow-sm transition hover:bg-[#f6faf8]"
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
              className={`absolute inset-0 bg-[#102b28]/38 backdrop-blur-md transition-opacity duration-300 ${
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
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0f766e] text-white">
                    <Scissors size={22} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">
                      Owner Panel
                    </p>
                    <p className="font-black">Santosh Salon</p>
                  </div>
                </div>
                <button
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f6faf8]"
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
                        ? "bg-[#0f766e] text-white"
                        : "bg-[#f6faf8] text-[#173734]"
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
                className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#173734] font-black text-white disabled:opacity-60"
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
              <p className="mb-5 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#173734] soft-shadow">
                {notice}
              </p>
            ) : null}

            <div className={activePage === "dashboard" ? "block" : "hidden"}>
            <section className="admin-hero soft-shadow overflow-hidden rounded-[2rem] p-5 text-white sm:p-7">
              <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-[#ccfbf1] ring-1 ring-white/20">
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
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-[#173734]">
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
                trend="+12%"
                tone="bg-[#ccfbf1] text-[#0f766e]"
              />
              <StatCard
                icon={UserCheck}
                label="Completed Today"
                value={String(completedCount).padStart(2, "0")}
                trend="+18%"
                tone="bg-[#dcfce7] text-[#15803d]"
              />
              <StatCard
                icon={Clock3}
                label="Tomorrow Bookings"
                value={String(tomorrowBookingCount).padStart(2, "0")}
                trend={getDisplayDate(tomorrowQueueDate)}
                tone="bg-[#ffedd5] text-[#f97316]"
              />
              <StatCard
                icon={WalletCards}
                label="Plan"
                value="Pro"
                trend="Active"
                tone="bg-[#e0f2fe] text-[#0284c7]"
              />
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
              <article className="chart-card soft-shadow rounded-3xl bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                      Weekly flow
                    </p>
                    <h3 className="text-2xl font-black">Customers vs completed</h3>
                  </div>
                  <select className="h-11 rounded-2xl border border-[#dbe8e3] bg-white px-4 text-sm font-bold outline-none">
                    <option>This week</option>
                    <option>Last week</option>
                  </select>
                </div>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trafficData}>
                      <defs>
                        <linearGradient id="customers" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#0f766e" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="completed" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.24} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                      <XAxis dataKey="day" stroke="#70817d" />
                      <YAxis stroke="#70817d" />
                      <Tooltip />
                      <Area
                        dataKey="customers"
                        fill="url(#customers)"
                        stroke="#0f766e"
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
              </article>

              <article className="soft-shadow rounded-3xl bg-white p-4 sm:p-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                  Actions
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  Current token {currentCustomer?.token || "-"}
                </h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <button
                    className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#0f766e] font-black text-white shadow-lg shadow-[#0f766e]/20 disabled:opacity-60"
                    disabled={actionLoading.startsWith("customer-")}
                    onClick={callNextCustomer}
                    type="button"
                  >
                    {actionLoading.startsWith("customer-") ? <ButtonSpinner /> : <PhoneCall size={19} />}
                    Call Next
                  </button>
                  <button
                    className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#fff7ed] font-black text-[#c2410c] disabled:opacity-60"
                    disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-skipped`}
                    onClick={() => updateCustomerStatus(currentCustomer, "skipped")}
                    type="button"
                  >
                    {actionLoading === `customer-${currentCustomer?.id}-skipped` ? <ButtonSpinner dark /> : <SkipForward size={19} />}
                    Skip
                  </button>
                  <button
                    className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#ecfdf5] font-black text-[#15803d] disabled:opacity-60"
                    disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-completed`}
                    onClick={() => updateCustomerStatus(currentCustomer, "completed")}
                    type="button"
                  >
                    {actionLoading === `customer-${currentCustomer?.id}-completed` ? <ButtonSpinner dark /> : <CheckCircle2 size={19} />}
                    Completed
                  </button>
                </div>
                <div className="mt-5 rounded-3xl bg-[#f6faf8] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#6b7b78]">Now serving</span>
                    <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-black text-[#166534]">
                      Live
                    </span>
                  </div>
                  <p className="mt-3 text-5xl font-black">
                    Token {currentCustomer?.token || "-"}
                  </p>
                  <p className="mt-2 text-[#6b7b78]">
                    {currentCustomer?.name || "No active customer"}
                  </p>
                </div>
              </article>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <article className="soft-shadow rounded-3xl bg-white p-4 sm:p-6">
                <h3 className="text-2xl font-black">Service split</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          cx="50%"
                          cy="50%"
                          data={serviceData}
                          dataKey="value"
                          innerRadius={48}
                          outerRadius={78}
                          paddingAngle={4}
                        >
                          {serviceData.map((item) => (
                            <Cell fill={item.color} key={item.name} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {serviceData.map((item) => (
                      <div
                        className="flex items-center justify-between rounded-2xl bg-[#f6faf8] px-4 py-3"
                        key={item.name}
                      >
                        <span className="flex items-center gap-2 font-bold">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ background: item.color }}
                          />
                          {item.name}
                        </span>
                        <span className="font-black">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="chart-card soft-shadow rounded-3xl bg-white p-4 sm:p-6">
                <h3 className="text-2xl font-black">Hourly wait trend</h3>
                <div className="mt-4 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                      <XAxis dataKey="time" stroke="#70817d" />
                      <YAxis stroke="#70817d" />
                      <Tooltip />
                      <Bar dataKey="wait" fill="#0f766e" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>

            <section className="soft-shadow mt-5 overflow-hidden rounded-3xl bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                    Queue
                  </p>
                  <h3 className="text-2xl font-black">Confirmed customers</h3>
                </div>
                <button
                  className="h-11 rounded-2xl bg-[#102b28] px-4 font-black text-white"
                  onClick={exportQueue}
                  type="button"
                >
                  Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#f6faf8] text-sm text-[#6b7b78]">
                      <th className="px-6 py-4">Token</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Mobile</th>
                      <th className="px-6 py-4">Booking</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQueue.map((customer) => (
                      <tr className="border-t border-[#edf3ef]" key={customer.token}>
                        <td className="px-6 py-4 text-xl font-black">
                          {customer.token}
                        </td>
                        <td className="px-6 py-4 font-bold">{customer.name}</td>
                        <td className="px-6 py-4 text-[#6b7b78]">
                          {customer.phone}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-[#0f766e]">
                          {customer.bookingLabel}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              customer.status === "skipped"
                                ? "bg-[#fee2e2] text-[#b91c1c]"
                                : "bg-[#dcfce7] text-[#166534]"
                            }`}
                          >
                            {statusLabel(customer.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f6faf8] text-[#ef4444]"
                            onClick={() => updateCustomerStatus(customer, "skipped")}
                            type="button"
                          >
                            <XCircle size={18} />
                          </button>
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
              </div>
            </section>
            </div>

            {activePage === "queue" ? (
              <section className="soft-shadow overflow-hidden rounded-3xl bg-white">
                <div className="grid gap-4 border-b border-[#edf3ef] p-4 sm:p-6 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                      Queue
                    </p>
                    <h2 className="text-3xl font-black">Live customers</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#102b28] px-4 font-black text-white"
                      onClick={exportQueue}
                      type="button"
                    >
                      <Download size={18} />
                      Export
                    </button>
                    <button
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-4 font-black text-white"
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
                  <div className="rounded-3xl bg-[#f6faf8] p-4 lg:col-span-2">
                    <p className="text-sm font-bold text-[#6b7b78]">
                      Today active bookings
                    </p>
                    <p className="mt-1 text-3xl font-black text-[#173734]">
                      {String(activeQueueItems.length).padStart(2, "0")}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#fff7ed] p-4 lg:col-span-2">
                    <p className="text-sm font-bold text-[#9a3412]">
                      Tomorrow bookings
                    </p>
                    <p className="mt-1 text-3xl font-black text-[#173734]">
                      {String(tomorrowBookingCount).padStart(2, "0")}
                    </p>
                    <p className="mt-1 text-xs font-black text-[#9a3412]">
                      {getDisplayDate(tomorrowQueueDate)}
                    </p>
                  </div>
                </div>

                <div className="mx-4 rounded-3xl bg-[#f6faf8] p-2 sm:mx-6">
                  <div className="queue-control-scroll flex snap-x gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
                    {queueStatusTabs.map((tab) => {
                      const count = todaysQueueItems.filter((item) =>
                        tab.statuses.includes(
                          String(item.status || "").toLowerCase()
                        )
                      ).length;
                      const active = queueStatusTab === tab.key;

                      return (
                        <button
                          className={`flex min-h-12 min-w-[44%] snap-start items-center justify-center gap-2 rounded-2xl px-4 font-black transition sm:min-w-[30%] lg:min-w-0 ${
                            active
                              ? "bg-[#0f766e] text-white shadow-lg shadow-[#0f766e]/15"
                              : "bg-white text-[#173734] hover:bg-[#eef8f5]"
                          }`}
                          key={tab.key}
                          onClick={() => setQueueStatusTab(tab.key)}
                          type="button"
                        >
                          {tab.label}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-[#eef8f5] text-[#0f766e]"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="queue-control-scroll mx-4 mt-4 flex snap-x gap-3 overflow-x-auto pb-1 sm:mx-6 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
                  <button
                    className="flex h-13 min-w-[54%] snap-start items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-5 font-black text-white disabled:opacity-60 sm:h-14 sm:min-w-0"
                    disabled={actionLoading.startsWith("customer-")}
                    onClick={callNextCustomer}
                    type="button"
                  >
                    {actionLoading.startsWith("customer-") ? <ButtonSpinner /> : <PhoneCall size={19} />}
                    Call
                  </button>
                  <button
                    className="flex h-13 min-w-[54%] snap-start items-center justify-center gap-2 rounded-2xl bg-[#fff7ed] px-5 font-black text-[#c2410c] disabled:opacity-60 sm:h-14 sm:min-w-0"
                    disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-skipped`}
                    onClick={() => updateCustomerStatus(currentCustomer, "skipped")}
                    type="button"
                  >
                    {actionLoading === `customer-${currentCustomer?.id}-skipped` ? <ButtonSpinner dark /> : <SkipForward size={19} />}
                    Skip
                  </button>
                  <button
                    className="flex h-13 min-w-[54%] snap-start items-center justify-center gap-2 rounded-2xl bg-[#ecfdf5] px-5 font-black text-[#15803d] disabled:opacity-60 sm:h-14 sm:min-w-0"
                    disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-completed`}
                    onClick={() => updateCustomerStatus(currentCustomer, "completed")}
                    type="button"
                  >
                    {actionLoading === `customer-${currentCustomer?.id}-completed` ? <ButtonSpinner dark /> : <CheckCircle2 size={19} />}
                    Complete
                  </button>
                </div>

                <div className="mt-5 overflow-x-auto px-4 pb-5 sm:px-6">
                  <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
                    <colgroup>
                      <col className="w-[90px]" />
                      <col className="w-[180px]" />
                      <col className="w-[160px]" />
                      <col className="w-[180px]" />
                      <col className="w-[150px]" />
                      <col className="w-[150px]" />
                      <col className="w-[130px]" />
                      <col className="w-[380px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#f6faf8] text-sm text-[#6b7b78]">
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
                        <tr className="border-t border-[#edf3ef]" key={customer.id || customer.token}>
                          <td className="px-5 py-4 text-xl font-black">{customer.token}</td>
                          <td className="px-5 py-4 font-bold">{customer.name}</td>
                          <td className="px-5 py-4 text-[#6b7b78]">{customer.phone}</td>
                          <td className="px-5 py-4 text-[#6b7b78]">{customer.service}</td>
                          <td className="px-5 py-4 text-sm font-bold text-[#0f766e]">
                            {customer.bookingLabel}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-[#173734]">
                            {customer.timeSlotLabel || customer.timeSlot || "-"}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-[#6b7b78]">
                            {statusLabel(customer.paymentStatus)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex h-8 min-w-24 items-center justify-center rounded-full bg-[#eef8f5] px-3 text-xs font-black text-[#0f766e]">
                              {statusLabel(customer.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="grid grid-cols-[64px_64px_70px_64px_76px] gap-2">
                              <button
                                className="grid h-11 place-items-center rounded-xl bg-[#ecfdf5] px-3 text-xs font-black text-[#15803d] disabled:opacity-60"
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
                                className="grid h-11 place-items-center rounded-xl bg-[#fff7ed] px-3 text-xs font-black text-[#c2410c] disabled:opacity-60"
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
                                className="grid h-11 place-items-center rounded-xl bg-[#e0f2fe] px-3 text-xs font-black text-[#0284c7] disabled:opacity-60"
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
                                className="grid h-11 place-items-center rounded-xl bg-[#f6faf8] px-3 text-xs font-black text-[#173734]"
                                onClick={() => openBookingEditor(customer)}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                className="grid h-11 place-items-center rounded-xl bg-[#fee2e2] px-3 text-xs font-black text-[#b91c1c] disabled:opacity-60"
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
                    <p className="p-5 text-sm font-bold text-[#6b7b78]">Loading queue...</p>
                  ) : null}
                  {!queueLoading && !filteredQueue.length ? (
                    <p className="p-5 text-sm font-bold text-[#6b7b78]">
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
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                        Services
                      </p>
                      <h2 className="mt-1 text-3xl font-black">
                        Website service cards
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm font-bold text-[#6b7b78]">
                        These cards appear live on the client website. Images
                        are uploaded to Cloudinary from the Add/Edit dialog.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-[#eef8f5] px-4 py-2 text-sm font-black text-[#0f766e]">
                        {serviceItems.length} items
                      </span>
                      <button
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#102b28] px-5 py-3 font-black text-white"
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
                        className="overflow-hidden rounded-3xl border border-[#edf3ef] bg-white shadow-sm"
                        key={service.id}
                      >
                        {service.imageUrl ? (
                          <img
                            alt={service.title}
                            className="h-44 w-full object-cover"
                            src={service.imageUrl}
                          />
                        ) : (
                          <div className="grid h-44 place-items-center bg-[#f6faf8] text-[#0f766e]">
                            <ImagePlus size={30} />
                          </div>
                        )}
                        <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-black">{service.title}</h3>
                            <p className="mt-1 text-sm font-bold text-[#6b7b78]">
                              {service.time} • {service.price}
                            </p>
                            <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-[#0f766e]">
                              {service.active ? "Visible" : "Hidden"}
                            </p>
                          </div>
                        </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#f6faf8] text-sm font-black text-[#173734]"
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
                    <p className="mt-5 rounded-2xl bg-[#f6faf8] p-4 text-sm font-bold text-[#6b7b78]">
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
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                      Refunds
                    </p>
                    <h2 className="mt-1 text-3xl font-black">
                      Customer refund requests
                    </h2>
                    <p className="mt-2 text-sm font-bold text-[#6b7b78]">
                      Review payment id/order id, then process Cashfree refund to the original payment method.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#eef8f5] px-4 py-2 text-sm font-black text-[#0f766e]">
                    {refundRequests.length} requests
                  </span>
                </div>

                <div className="mt-5 overflow-x-auto rounded-2xl">
                  <table className="min-w-[1180px] w-full text-left">
                    <thead className="bg-[#f6faf8] text-sm font-black text-[#6b7b78]">
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
                        <tr className="border-b border-[#edf3ef]" key={refund.id}>
                          <td className="px-5 py-5">
                            <p className="font-black text-[#173734]">{refund.customerName}</p>
                            <p className="mt-1 text-xs font-bold text-[#6b7b78]">
                              {refund.customerEmail}
                            </p>
                          </td>
                          <td className="px-5 py-5 font-bold text-[#52625f]">
                            {refund.customerMobile}
                          </td>
                          <td className="px-5 py-5 font-black text-[#0f766e]">
                            Rs. {Number(refund.amount || 0).toFixed(2)}
                          </td>
                          <td className="max-w-[180px] break-words px-5 py-5 font-black text-[#173734]">
                            {refund.paymentId || "-"}
                          </td>
                          <td className="max-w-[220px] break-words px-5 py-5 font-black text-[#173734]">
                            {refund.orderId || "-"}
                          </td>
                          <td className="px-5 py-5">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                refund.status === "completed"
                                  ? "bg-[#dcfce7] text-[#166534]"
                                  : ["rejected", "failed"].includes(refund.status)
                                    ? "bg-[#fee2e2] text-[#b91c1c]"
                                    : refund.status === "processing"
                                      ? "bg-[#e0f2fe] text-[#0369a1]"
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
                                        ? "bg-[#dcfce7] text-[#166534]"
                                        : "bg-[#f6faf8] text-[#173734]"
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
                            className="px-5 py-7 font-bold text-[#6b7b78]"
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
                  <p className="mt-5 rounded-2xl bg-[#f6faf8] p-4 text-sm font-bold text-[#6b7b78]">
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
              <section className="soft-shadow rounded-3xl bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                      Users
                    </p>
                    <h2 className="mt-1 text-3xl font-black">
                      Website login customers
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#eef8f5] px-4 py-2 text-sm font-black text-[#0f766e]">
                    {registeredUsers.length} users
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Total Users", registeredUsers.length],
                    ["Google Login", googleUsers],
                    ["Phone Added", usersWithPhone]
                  ].map(([label, value]) => (
                    <div className="rounded-2xl bg-[#f6faf8] p-4" key={label}>
                      <p className="text-sm font-bold text-[#6b7b78]">
                        {label}
                      </p>
                      <p className="mt-1 text-3xl font-black text-[#173734]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#d9e5df] bg-white px-4 py-3 text-[#6b7b78] sm:hidden">
                  <Search size={18} />
                  <input
                    className="w-full border-0 bg-transparent outline-none"
                    onChange={(event) => setUserSearchTerm(event.target.value)}
                    placeholder="Search users, email, phone"
                    value={userSearchTerm}
                  />
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead>
                      <tr className="bg-[#f6faf8] text-sm text-[#6b7b78]">
                        <th className="px-5 py-4">User</th>
                        <th className="px-5 py-4">Email</th>
                        <th className="px-5 py-4">Phone</th>
                        <th className="px-5 py-4">Provider</th>
                        <th className="px-5 py-4">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((customer) => (
                        <tr className="border-t border-[#edf3ef]" key={customer.id}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {customer.photoURL ? (
                                <img
                                  alt={customer.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={customer.photoURL}
                                />
                              ) : (
                                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0f766e] font-black uppercase text-white">
                                  {customer.name.charAt(0)}
                                </span>
                              )}
                              <span className="font-black">{customer.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[#6b7b78]">{customer.email}</td>
                          <td className="px-5 py-4 text-[#6b7b78]">{customer.phone}</td>
                          <td className="px-5 py-4 text-[#6b7b78]">{customer.provider}</td>
                          <td className="px-5 py-4 text-[#6b7b78]">
                            {customer.updatedAt?.toDate
                              ? customer.updatedAt.toDate().toLocaleString("en-IN")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {usersLoading ? (
                    <p className="p-5 text-sm font-bold text-[#6b7b78]">Loading users...</p>
                  ) : null}
                  {!usersLoading && !filteredUsers.length ? (
                    <p className="p-5 text-sm font-bold text-[#6b7b78]">
                      {registeredUsers.length
                        ? "No users matched your search."
                        : "No website users have logged in yet."}
                    </p>
                  ) : null}
                  <PaginationControls
                    onPageChange={setUsersPage}
                    page={safeUsersPage}
                    totalPages={usersTotalPages}
                  />
                </div>
              </section>
            ) : null}

            {activePage === "public-link" ? (
              <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
                <article className="soft-shadow rounded-3xl bg-white p-5 sm:p-6">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                    Public Link
                  </p>
                  <h2 className="mt-1 text-3xl font-black">Customer queue URL</h2>
                  <p className="mt-3 leading-7 text-[#6b7b78]">
                    Customers can use this link to open the salon page, choose a
                    service, pay, and join the queue.
                  </p>
                  <div className="mt-5 flex flex-col gap-3 rounded-3xl bg-[#f6faf8] p-4 sm:flex-row sm:items-center">
                    <p className="min-w-0 flex-1 break-all font-black text-[#173734]">
                      {publicQueueLink}
                    </p>
                    <button
                      className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#102b28] px-4 font-black text-white disabled:opacity-60"
                      disabled={actionLoading === "copy-link"}
                      onClick={copyPublicLink}
                      type="button"
                    >
                      {actionLoading === "copy-link" ? <ButtonSpinner /> : <Copy size={18} />}
                      {actionLoading === "copy-link" ? "Copying..." : "Copy"}
                    </button>
                  </div>
                </article>
                <article className="soft-shadow rounded-3xl bg-[#173734] p-5 text-white sm:p-6">
                  <QrCode className="text-[#f9c66d]" size={34} />
                  <h3 className="mt-5 text-2xl font-black">QR placeholder</h3>
                  <p className="mt-2 leading-7 text-white/72">
                    QR generation library can be added next; the link itself is
                    already copy-ready.
                  </p>
                  <a
                    className="mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 font-black text-[#173734]"
                    href={publicQueueLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink size={18} /> Open Link
                  </a>
                </article>
              </section>
            ) : null}

            {activePage === "plans" ? (
              <section className="soft-shadow grid gap-5 rounded-3xl bg-white p-5 sm:p-6 lg:grid-cols-[1fr_380px] lg:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                    Plans
                  </p>
                  <h2 className="mt-1 text-3xl font-black">
                    {premiumActive ? "Premium plan active" : "Premium Rs. 699/month"}
                  </h2>
                  <p className="mt-3 max-w-2xl leading-7 text-[#6b7b78]">
                    {premiumActive
                      ? "Payment success details saved. Premium queue controls are active for this salon."
                      : "Premium plan unlocks analytics, branded public queue links, payment-ready queue flow, and owner growth insights."}
                  </p>
                  {premiumActive ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {[
                        ["Status", "Active"],
                        ["Valid Till", formatDateTime(premiumUntilDate)],
                        ["Payment ID", salonProfile.razorpay?.paymentId || "-"],
                        ["Order ID", salonProfile.razorpay?.orderId || "-"]
                      ].map(([label, value]) => (
                        <div className="rounded-2xl bg-[#f6faf8] p-4" key={label}>
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6b7b78]">
                            {label}
                          </p>
                          <p className="mt-1 break-words font-black text-[#173734]">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {subscriptionStatus ? (
                    <p className="mt-4 rounded-2xl bg-[#f6faf8] px-4 py-3 text-sm font-bold text-[#173734]">
                      {subscriptionStatus}
                    </p>
                  ) : null}
                </div>
                {premiumActive ? (
                  <div className="rounded-3xl bg-[#ecfdf5] p-5 text-[#166534]">
                    <CheckCircle2 size={30} />
                    <h3 className="mt-4 text-2xl font-black">Payment success</h3>
                    <p className="mt-2 text-sm font-bold leading-6">
                      Premium features enabled for 30 days. Client booking gate
                      will remain open while this subscription is active.
                    </p>
                  </div>
                ) : (
                  <button
                    className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-5 py-4 font-black text-white disabled:opacity-60"
                    disabled={subscriptionLoading}
                    onClick={handlePremiumSubscribe}
                    type="button"
                  >
                    {subscriptionLoading ? <ButtonSpinner /> : <CreditCard size={20} />}
                    {subscriptionLoading ? "Opening Razorpay..." : "Subscribe Rs. 699"}
                  </button>
                )}
              </section>
            ) : null}

            {activePage === "settings" ? (
              <section className="soft-shadow rounded-3xl bg-white p-5 sm:p-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                  Settings
                </p>
                <h2 className="mt-1 text-3xl font-black">Salon profile</h2>
                <div className="mt-6 rounded-3xl border border-[#d9e5df] bg-[#f6faf8] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                        Shop Status
                      </p>
                      <h3 className="mt-1 text-2xl font-black text-[#173734]">
                        {settingsDraft.manualShopClosed
                          ? "Closed for booking"
                          : "Open for booking"}
                      </h3>
                      <p className="mt-2 text-sm font-bold text-[#6b7b78]">
                        Automatic booking window uses Opening Time and Closing
                        Time. Use manual close for early closure or emergencies.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-5 py-3 font-black text-white disabled:opacity-60"
                        disabled={
                          actionLoading === "shop-status" ||
                          !settingsDraft.manualShopClosed
                        }
                        onClick={() => toggleShopClosed(false)}
                        type="button"
                      >
                        {actionLoading === "shop-status" ? <ButtonSpinner /> : <CheckCircle2 size={18} />}
                        Open Shop
                      </button>
                      <button
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#fee2e2] px-5 py-3 font-black text-[#b91c1c] disabled:opacity-60"
                        disabled={
                          actionLoading === "shop-status" ||
                          settingsDraft.manualShopClosed
                        }
                        onClick={() => toggleShopClosed(true)}
                        type="button"
                      >
                        {actionLoading === "shop-status" ? <ButtonSpinner dark /> : <XCircle size={18} />}
                        Close Shop
                      </button>
                    </div>
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-bold text-[#173734]">
                      Close Message
                    </span>
                    <input
                      className="h-12 w-full rounded-2xl border border-[#d9e5df] bg-white px-4 outline-none focus:border-[#0f766e]"
                      onChange={(event) =>
                        setSettingsDraft((value) => ({
                          ...value,
                          manualCloseReason: event.target.value
                        }))
                      }
                      placeholder="Example: Shop closed early today. Please try tomorrow."
                      value={settingsDraft.manualCloseReason || ""}
                    />
                  </label>
                </div>
                <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveSalonSettings}>
                  {[
                    ["name", "Salon Name"],
                    ["slug", "Public Slug"],
                    ["phone", "Phone"],
                    ["address", "Address"],
                    ["openingTime", "Opening Time"],
                    ["closingTime", "Closing Time"]
                  ].map(([field, label]) => (
                    <label className="block" key={field}>
                      <span className="mb-2 block text-sm font-bold text-[#173734]">
                        {label}
                      </span>
                      <input
                        className="h-12 w-full rounded-2xl border border-[#d9e5df] bg-white px-4 outline-none focus:border-[#0f766e]"
                        onChange={(event) =>
                          setSettingsDraft((value) => ({
                            ...value,
                            [field]: event.target.value
                          }))
                        }
                        type={field.includes("Time") ? "time" : "text"}
                        value={settingsDraft[field] || ""}
                      />
                    </label>
                  ))}
                  <div className="sm:col-span-2">
                    <button
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#102b28] px-5 py-3 font-black text-white disabled:opacity-60"
                      disabled={actionLoading === "settings-save"}
                      type="submit"
                    >
                      {actionLoading === "settings-save" ? <ButtonSpinner /> : <Save size={18} />}
                      {actionLoading === "settings-save" ? "Saving..." : "Save Settings"}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}
          </div>
        </section>
      </div>
      {serviceDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#102b28]/70 px-4 py-6 backdrop-blur-sm">
          <form
            className="soft-shadow max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 sm:p-6"
            onSubmit={saveService}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                  Haircut Design
                </p>
                <h2 className="mt-1 text-3xl font-black">
                  {editingServiceId ? "Update service" : "Add service"}
                </h2>
                <p className="mt-2 text-sm font-bold text-[#6b7b78]">
                  Service images are saved in Cloudinary. When you choose a new
                  image while editing, the previous Cloudinary image is deleted.
                </p>
              </div>
              <button
                className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f6faf8]"
                onClick={resetServiceForm}
                type="button"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-[#173734]">
                  Service Name
                </span>
                <input
                  className="h-12 w-full rounded-2xl border border-[#d9e5df] px-4 outline-none focus:border-[#0f766e]"
                  onChange={(event) =>
                    setServiceDraft((value) => ({
                      ...value,
                      title: event.target.value
                    }))
                  }
                  placeholder="Classic Haircut"
                  value={serviceDraft.title}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#173734]">
                  Time
                </span>
                <input
                  className="h-12 w-full rounded-2xl border border-[#d9e5df] px-4 outline-none focus:border-[#0f766e]"
                  onChange={(event) =>
                    setServiceDraft((value) => ({
                      ...value,
                      time: event.target.value
                    }))
                  }
                  value={serviceDraft.time}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#173734]">
                  Price
                </span>
                <input
                  className="h-12 w-full rounded-2xl border border-[#d9e5df] px-4 outline-none focus:border-[#0f766e]"
                  min="1"
                  onChange={(event) =>
                    setServiceDraft((value) => ({
                      ...value,
                      amount: event.target.value
                    }))
                  }
                  type="number"
                  value={serviceDraft.amount}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-[#173734]">
                  Service Image
                </span>
                <input
                  accept="image/*"
                  className="h-12 w-full rounded-2xl border border-[#d9e5df] bg-white px-4 py-2 file:mr-4 file:rounded-xl file:border-0 file:bg-[#0f766e] file:px-4 file:py-2 file:font-black file:text-white outline-none focus:border-[#0f766e]"
                  onChange={handleServiceImageChange}
                  type="file"
                />
              </label>
              <div className="sm:col-span-2">
                {serviceDraft.imagePreview || serviceDraft.imageUrl ? (
                  <img
                    alt="Service preview"
                    className="h-56 w-full rounded-2xl object-cover"
                    src={serviceDraft.imagePreview || serviceDraft.imageUrl}
                  />
                ) : (
                  <div className="grid h-56 place-items-center rounded-2xl bg-[#f6faf8] text-[#0f766e]">
                    <ImagePlus size={30} />
                  </div>
                )}
              </div>
              <label className="flex items-center gap-3 rounded-2xl bg-[#f6faf8] p-4 font-bold sm:col-span-2">
                <input
                  checked={serviceDraft.active}
                  className="h-5 w-5 accent-[#0f766e]"
                  onChange={(event) =>
                    setServiceDraft((value) => ({
                      ...value,
                      active: event.target.checked
                    }))
                  }
                  type="checkbox"
                />
                Show on client website
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#102b28] px-5 py-3 font-black text-white disabled:opacity-60"
                disabled={actionLoading === "service-save"}
                type="submit"
              >
                {actionLoading === "service-save" ? (
                  <ButtonSpinner />
                ) : (
                  <Save size={18} />
                )}
                {actionLoading === "service-save"
                  ? "Saving..."
                  : editingServiceId
                    ? "Update Service"
                    : "Add Service"}
              </button>
              <button
                className="min-h-12 rounded-2xl bg-[#f6faf8] px-5 py-3 font-black text-[#173734]"
                onClick={resetServiceForm}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {bookingDraft ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#102b28]/70 px-4 py-6 backdrop-blur-sm">
          <form
            className="soft-shadow max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 sm:p-6"
            onSubmit={saveBookingEdit}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                  Booking
                </p>
                <h2 className="mt-1 text-3xl font-black">
                  {adminBookingMode ? "Create booking" : "Update booking"}
                </h2>
              </div>
              <button
                className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f6faf8]"
                onClick={() => {
                  setEditingBookingId("");
                  setAdminBookingMode(false);
                  setBookingDraft(null);
                }}
                type="button"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["name", "Customer Name", "text"],
                ["mobile", "Mobile", "text"],
                ["email", "Registered Email", "email"],
                ["amount", "Amount", "number"]
              ].map(([field, label, type]) => (
                <label className="block" key={field}>
                  <span className="mb-2 block text-sm font-bold text-[#173734]">
                    {label}
                  </span>
                  <input
                    className="h-12 w-full rounded-2xl border border-[#d9e5df] px-4 outline-none focus:border-[#0f766e]"
                    onChange={(event) =>
                      setBookingDraft((value) => ({
                        ...value,
                        [field]: event.target.value
                      }))
                    }
                    type={type}
                    value={bookingDraft[field] || ""}
                  />
                </label>
              ))}
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#173734]">
                  Booking Date
                </span>
                <input
                  className="h-12 w-full rounded-2xl border border-[#d9e5df] px-4 outline-none focus:border-[#0f766e]"
                  min={todayDateValue}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    const nextSlots = getAdminBookableSlots(nextDate);
                    setBookingDraft((value) => ({
                      ...value,
                      bookingDate: nextDate,
                      timeSlot: nextSlots.some(
                        (slot) => slot.value === value.timeSlot
                      )
                        ? value.timeSlot
                        : nextSlots[0]?.value || ""
                    }));
                  }}
                  type="date"
                  value={adminBookingDateValue}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-[#173734]">
                  Service
                </span>
                <select
                  className="h-12 w-full rounded-2xl border border-[#d9e5df] bg-white px-4 outline-none focus:border-[#0f766e]"
                  onChange={(event) => {
                    const selectedService = serviceItems.find(
                      (service) => service.title === event.target.value
                    );
                    setBookingDraft((value) => ({
                      ...value,
                      service: event.target.value,
                      amount: selectedService?.amount ?? value.amount
                    }));
                  }}
                  value={bookingDraft.service || ""}
                >
                  {serviceItems.filter((service) => service.active).map((service) => (
                    <option key={service.id || service.title} value={service.title}>
                      {service.title} - Rs. {service.amount}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#173734]">
                  Time Slot
                </span>
                <select
                  className="h-12 w-full rounded-2xl border border-[#d9e5df] px-4 outline-none focus:border-[#0f766e]"
                  disabled={!adminBookingSlots.length}
                  onChange={(event) =>
                    setBookingDraft((value) => ({
                      ...value,
                      timeSlot: event.target.value
                    }))
                  }
                  value={adminBookingTimeSlotValue}
                >
                  {adminBookingSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                {!adminBookingSlots.length ? (
                  <p className="mt-2 text-xs font-bold text-[#b91c1c]">
                    No future slots are available for the selected date.
                  </p>
                ) : null}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#173734]">
                  Status
                </span>
                <select
                  className="h-12 w-full rounded-2xl border border-[#d9e5df] px-4 outline-none focus:border-[#0f766e]"
                  onChange={(event) =>
                    setBookingDraft((value) => ({
                      ...value,
                      status: event.target.value
                    }))
                  }
                  value={bookingDraft.status || "waiting"}
                >
                  <option value="waiting">Confirmed</option>
                  <option value="waitlist">Waiting</option>
                  <option value="in_chair">In Chair</option>
                  <option value="skipped">Skipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
            <button
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#102b28] px-5 py-3 font-black text-white disabled:opacity-60"
              disabled={actionLoading === "booking-save"}
              type="submit"
            >
              {actionLoading === "booking-save" ? <ButtonSpinner /> : <Save size={18} />}
              {actionLoading === "booking-save"
                ? "Saving..."
                : adminBookingMode
                  ? "Create Booking"
                  : "Save Booking"}
            </button>
          </form>
        </div>
      ) : null}
      {confirmDialog ? (
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
