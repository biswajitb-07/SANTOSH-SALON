import React from "react";
import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
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
  Eye,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PhoneCall,
  QrCode,
  Scissors,
  Search,
  Settings,
  SkipForward,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  UsersRound,
  WalletCards,
  X,
  XCircle
} from "lucide-react";
import { auth, db, googleProvider } from "../lib/firebase.js";
import { getAuthHeader } from "../lib/apiAuth.js";
import { getSafeErrorMessage } from "../lib/errors.js";
import { applyAdminSeo } from "../lib/seo.js";
import { getAdminRoute, writeAdminRoute } from "../lib/routing.js";
import {
  activeTransferStatuses,
  ADMIN_ALLOWED_EMAILS,
  ADMIN_PAGE_SIZE,
  API_URL,
  ChartEmpty,
  CLIENT_URL,
  confirmedBookingStatuses,
  createTimeSlots,
  DAILY_CONFIRMED_LIMIT,
  defaultSalonProfile,
  defaultServiceDraft,
  DEFAULT_BARBER_NAMES,
  DEFAULT_BARBER_PLACEHOLDERS,
  fileToDataUrl,
  formatDateTime,
  getBarberAvailabilityForDate,
  getBarberStatsId,
  getBookingSortMinutes,
  getDisplayDate,
  getPremiumUntilDate,
  getProfileBarberNames,
  getProfileBarbers,
  getRecentDateValues,
  getRequestErrorMessage,
  getSafeBarberImageUrl,
  getShortDayLabel,
  getTomorrowDateValue,
  getVisibleAdminTimeSlots,
  hasChartValue,
  isPremiumActive,
  loadRazorpayCheckout,
  minutesFromSlot,
  navItems,
  normalizeCustomer,
  normalizeRefund,
  normalizeService,
  normalizeUser,
  PLATFORM_FEE_PER_PERSON,
  queueStatusTabs,
  serviceChartColors,
  SERVICE_PAGE_SIZE,
  shouldCountRevenue,
  sortBookingsForTurns,
  STAFF_COUNT,
  statusLabel,
  statusTone,
  timeSlots,
  toDateInputValue
} from "../lib/adminFlow.jsx";
import {
  ButtonSpinner,
  ConfirmDialog,
  PaginationControls,
  UserAvatar,
  useBodyScrollLock,
  useDragScroll
} from "../components/common.jsx";
import { StatCard } from "../components/dashboard.jsx";
import { BookingDialog, ServiceDialog } from "../components/dialogs.jsx";
import {
  AdminAccessBlockedScreen,
  AdminLoadingScreen,
  AdminLoginScreen
} from "../pages/authScreens.jsx";
import {
  PlansPage,
  PublicLinkPage,
  SettingsPage
} from "../pages/profilePages.jsx";
import { ContactIssuesPage } from "../pages/ContactIssuesPage.jsx";
import { UsersPage } from "../pages/UsersPage.jsx";

import {
  useCreateSubscriptionOrderMutation,
  useVerifySubscriptionPaymentMutation
} from "../store/api/subscriptionsApi.js";



export function useAdminController() {
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
  const [couponDraft, setCouponDraft] = useState(defaultSalonProfile.coupons);
  const [couponEditor, setCouponEditor] = useState(null);
  const [barberEditor, setBarberEditor] = useState(null);
  const [barberStats, setBarberStats] = useState({});
  const [serviceItems, setServiceItems] = useState([]);
  const [serviceDraft, setServiceDraft] = useState(defaultServiceDraft);
  const [editingServiceId, setEditingServiceId] = useState("");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [photoPreviewService, setPhotoPreviewService] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [refundRequests, setRefundRequests] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(true);
  const [openMessageCount, setOpenMessageCount] = useState(0);
  const [editingBookingId, setEditingBookingId] = useState("");
  const [bookingDraft, setBookingDraft] = useState(null);
  const [adminBookingMode, setAdminBookingMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedRefundIds, setSelectedRefundIds] = useState([]);
  const [draggedQueueId, setDraggedQueueId] = useState("");
  const [staffAvailabilityDate, setStaffAvailabilityDate] = useState(() =>
    toDateInputValue(new Date())
  );
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
  const queueTabDragScroll = useDragScroll({ enabled: true });
  useBodyScrollLock(Boolean(photoPreviewService));

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
    applyAdminSeo(user ? activePage : "dashboard");
  }, [activePage, user]);

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

    return onSnapshot(
      collection(db, "barberStats"),
      (snapshot) => {
        setBarberStats(
          snapshot.docs.reduce((accumulator, snapshotDoc) => {
            const data = snapshotDoc.data();
            if (data.name) accumulator[data.name] = data;
            return accumulator;
          }, {})
        );
      },
      () => setBarberStats({})
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
    const usersRef = query(
      collection(db, "users"),
      orderBy("updatedAt", "desc"),
      limit(250)
    );

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
      orderBy("createdAt", "desc"),
      limit(200)
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
    if (!user) {
      setOpenMessageCount(0);
      return undefined;
    }

    const messagesRef = query(
      collection(db, "contactIssues"),
      where("status", "in", ["open", "pending", "in_progress"])
    );
    return onSnapshot(
      messagesRef,
      (snapshot) => setOpenMessageCount(snapshot.size),
      () => setOpenMessageCount(0)
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
        setCouponDraft(nextProfile.coupons || defaultSalonProfile.coupons);
      },
      () => {
        setSalonProfile(defaultSalonProfile);
        setSettingsDraft(defaultSalonProfile);
        setCouponDraft(defaultSalonProfile.coupons);
      }
    );
  }, [user]);

  const handleGoogleLogin = async () => {
    setAuthError("");
    setActionLoading("login");
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Admin login successful.");
    } catch (error) {
      const message = getSafeErrorMessage(
        error,
        "Google login failed. Please try again."
      );
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
      toast.success("Admin logout successful.");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Admin logout failed."));
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

  const salonTimeSlots = createTimeSlots(
    salonProfile.openingTime,
    salonProfile.closingTime
  );

  function getAdminBookableSlots(bookingDate, currentSlot = "") {
    const visibleSlots = getVisibleAdminTimeSlots(bookingDate, salonTimeSlots);
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
  const profileBarberNames = getProfileBarberNames(salonProfile);
  const profileBarbers = getProfileBarbers(salonProfile);
  const barberRatingSummary = profileBarberNames.reduce((accumulator, barberName) => {
    const stats = barberStats[barberName] || {};
    const ratingCount = Number(stats.ratingCount || 0);
    const ratingAverage = ratingCount
      ? Math.round((Number(stats.ratingTotal || 0) / ratingCount) * 10) / 10
      : 0;
    accumulator[barberName] = { ratingAverage, ratingCount };
    return accumulator;
  }, {});
  const activeQueueItems = todaysQueueItems.filter((item) =>
    activeTransferStatuses.has(String(item.status || "").toLowerCase())
  );
  const activeDisplayQueue = activeQueueItems.map((item, index) => ({
    ...item,
    token: index + 1
  }));
  const todayBarberAvailability = getBarberAvailabilityForDate(
    salonProfile,
    todayQueueDate
  );
  const selectedDateBarberAvailability = getBarberAvailabilityForDate(
    salonProfile,
    staffAvailabilityDate
  );
  const inChairByBarber = profileBarberNames.map((barberName) => ({
    barberName,
    booking: activeDisplayQueue.find(
      (item) =>
        String(item.status || "").toLowerCase() === "in_chair" &&
        item.barberName === barberName
    )
  }));
  const idleAvailableBarberNames = todayBarberAvailability
    .filter(
      (barber) =>
        barber.available &&
        !inChairByBarber.some(
          ({ barberName, booking }) => barberName === barber.name && booking
        )
    )
    .map((barber) => barber.name);
  const canCallCustomer = (customer) => {
    if (String(customer.status || "").toLowerCase() !== "waiting") return false;
    if (!idleAvailableBarberNames.length) return false;
    if (!customer.barberName || customer.barberName === "Next available barber") {
      return true;
    }
    return idleAvailableBarberNames.includes(customer.barberName);
  };

  useEffect(() => {
    if (!user || !profileBarberNames.length) return;
    profileBarberNames.forEach((barberName) => {
      const activeCount = activeDisplayQueue.filter((item) => {
        const status = String(item.status || "").toLowerCase();
        return (
          item.barberName === barberName &&
          ["waiting", "waitlist", "in_chair"].includes(status)
        );
      }).length;
      setDoc(
        doc(db, "barberStats", getBarberStatsId(barberName)),
        {
          name: barberName,
          activeCount,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      ).catch(() => {});
    });
  }, [
    user?.uid,
    profileBarberNames.join("|"),
    activeDisplayQueue
      .map((item) => `${item.id}:${item.status}:${item.barberName}`)
      .join("|")
  ]);

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
  const serviceTotalPages = Math.max(1, Math.ceil(serviceItems.length / SERVICE_PAGE_SIZE));
  const safeServicePage = Math.min(servicePage, serviceTotalPages);
  const paginatedServices = serviceItems.slice(
    (safeServicePage - 1) * SERVICE_PAGE_SIZE,
    safeServicePage * SERVICE_PAGE_SIZE
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
  const paginatedBookingIds = paginatedQueue
    .map((booking) => booking.id)
    .filter(Boolean);
  const paginatedServiceIds = paginatedServices
    .map((service) => service.id)
    .filter(Boolean);
  const paginatedRefundIds = paginatedRefunds
    .map((refund) => refund.id)
    .filter(Boolean);
  const selectedBookings = filteredQueue.filter((booking) =>
    selectedBookingIds.includes(booking.id)
  );
  const selectedServices = serviceItems.filter((service) =>
    selectedServiceIds.includes(service.id)
  );
  const selectedRefunds = refundRequests.filter((refund) =>
    selectedRefundIds.includes(refund.id)
  );
  const bookingPageAllSelected =
    paginatedBookingIds.length > 0 &&
    paginatedBookingIds.every((id) => selectedBookingIds.includes(id));
  const servicePageAllSelected =
    paginatedServiceIds.length > 0 &&
    paginatedServiceIds.every((id) => selectedServiceIds.includes(id));
  const refundPageAllSelected =
    paginatedRefundIds.length > 0 &&
    paginatedRefundIds.every((id) => selectedRefundIds.includes(id));
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

  useEffect(() => {
    setSelectedBookingIds((ids) =>
      ids.filter((id) => filteredQueue.some((booking) => booking.id === id))
    );
  }, [filteredQueue.length, queueStatusTab]);

  useEffect(() => {
    setSelectedServiceIds((ids) =>
      ids.filter((id) => serviceItems.some((service) => service.id === id))
    );
  }, [serviceItems.length]);

  useEffect(() => {
    setSelectedRefundIds((ids) =>
      ids.filter((id) => refundRequests.some((refund) => refund.id === id))
    );
  }, [refundRequests.length]);

  const toggleSelection = (setter, id) => {
    if (!id) return;
    setter((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]
    );
  };

  const togglePageSelection = (setter, pageIds, checked) => {
    setter((ids) => {
      if (checked) {
        return [...new Set([...ids, ...pageIds])];
      }
      return ids.filter((id) => !pageIds.includes(id));
    });
  };

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
  const hourlyRushData = salonTimeSlots
    .filter((_, index) => index % 2 === 0)
    .map((slot) => {
      const hour = Number(slot.value.split(":")[0]);
      const matchingSlots = salonTimeSlots
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
    : salonTimeSlots;
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
          queuePosition: index + 1,
          turnSortMinutes: getBookingSortMinutes(booking)
        })
      )
    );

    const slotCounts = activeBookings.reduce((counts, booking) => {
      const slot = booking.timeSlot || "";
      if (slot) counts[slot] = (counts[slot] || 0) + 1;
      return counts;
    }, {});
    const waitlistCount = snapshot.docs.filter(
      (snapshotDoc) =>
        String(snapshotDoc.data().status || "").toLowerCase() === "waitlist"
    ).length;

    await setDoc(
      doc(db, "bookingCounters", bookingDate),
      {
        bookingDate,
        confirmedCount: activeBookings.length,
        waitlistCount,
        slotCounts,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return activeBookings.map((booking, index) => ({
      ...booking,
      token: index + 1,
      peopleAhead: index,
      queuePosition: index + 1
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
      const payload = {
        status,
        updatedAt: serverTimestamp()
      };

      if (status === "in_chair") {
        const busyBarbers = activeDisplayQueue
          .filter((item) => String(item.status || "").toLowerCase() === "in_chair")
          .map((item) => item.barberName)
          .filter(Boolean);
        const availableBarbers = todayBarberAvailability
          .filter((barber) => barber.available && !busyBarbers.includes(barber.name))
          .map((barber) => barber.name);
        const preferredBarber = customer.barberName;
        const assignedBarber =
          preferredBarber &&
          preferredBarber !== "Next available barber" &&
          availableBarbers.includes(preferredBarber)
            ? preferredBarber
            : availableBarbers[0];

        if (!assignedBarber) {
          throw new Error("No barber chair is available right now.");
        }

        payload.barberName = assignedBarber;
        payload.calledAt = serverTimestamp();
      }

      await updateDoc(doc(db, "customers", customer.id), {
        ...payload
      });
      if (["completed", "skipped", "cancelled"].includes(status)) {
        await promoteNextWaitlist(customer.bookingDate);
      }
      await reindexQueueDate(customer.bookingDate);
      const message = `Token ${customer.token} marked ${statusLabel(status)}.`;
      setNotice(message);
      toast.success(message);
    } catch (error) {
      const message = getSafeErrorMessage(error, "Unable to update queue status.");
      setNotice(message);
      toast.error(message);
    } finally {
      setActionLoading("");
    }
  };

  const reorderQueueBooking = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const sourceIndex = activeDisplayQueue.findIndex((item) => item.id === sourceId);
    const targetIndex = activeDisplayQueue.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextOrder = [...activeDisplayQueue];
    const [moved] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);

    setActionLoading("queue-reorder");
    try {
      const batch = writeBatch(db);
      nextOrder.forEach((booking, index) => {
        batch.update(doc(db, "customers", booking.id), {
          queuePosition: index + 1,
          token: index + 1,
          peopleAhead: index,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      toast.success("Queue order updated.");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Queue order could not be updated."));
    } finally {
      setDraggedQueueId("");
      setActionLoading("");
    }
  };

  const notifyTurnNear = async (customer) => {
    if (!customer?.id) return;
    const loadingKey = `customer-${customer.id}-notify`;
    setActionLoading(loadingKey);
    try {
      await updateDoc(doc(db, "customers", customer.id), {
        arrivalNote: "Your turn is near. Please reach Santosh Salon soon.",
        notifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success(`Turn-near notification marked for ${customer.name}.`);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Notification could not be saved."));
    } finally {
      setActionLoading("");
    }
  };

  const updateStaffAttendance = async (staffName, available) => {
    if (!user || !staffName) return;
    const loadingKey = `staff-${staffName}`;
    setActionLoading(loadingKey);
    try {
      const currentSchedule = salonProfile.barberAvailability?.[staffName] || {
        available: true,
        unavailableDates: []
      };
      const unavailableDates = Array.isArray(currentSchedule.unavailableDates)
        ? currentSchedule.unavailableDates
        : [];
      const nextUnavailableDates = available
        ? unavailableDates.filter((dateValue) => dateValue !== staffAvailabilityDate)
        : [...new Set([...unavailableDates, staffAvailabilityDate])];
      const nextAvailability = {
        ...(salonProfile.barberAvailability || {}),
        [staffName]: {
          available: currentSchedule.available !== false,
          unavailableDates: nextUnavailableDates
        }
      };
      await setDoc(
        doc(db, "salons", user.uid),
        {
          barberAvailability: nextAvailability,
          staffAttendance: profileBarberNames.reduce((accumulator, name) => {
            accumulator[name] =
              name === staffName ? available : salonProfile.staffAttendance?.[name] !== false;
            return accumulator;
          }, {}),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      toast.success(
        `${staffName} marked ${available ? "available" : "unavailable"} for ${getDisplayDate(staffAvailabilityDate)}.`
      );
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Staff availability could not be updated."));
    } finally {
      setActionLoading("");
    }
  };

  const persistBarbers = async (nextBarbers, successMessage) => {
    if (!user) return;
    const normalizedBarbers = nextBarbers
      .map((barber) => ({
        name: String(barber.name || "").trim(),
        active: barber.active !== false,
        imageUrl: getSafeBarberImageUrl(barber.imageUrl),
        imagePublicId: barber.imagePublicId || ""
      }))
      .filter((barber) => barber.name);
    const names = normalizedBarbers.map((barber) => barber.name);
    const nextAvailability = names.reduce((accumulator, name) => {
      accumulator[name] = salonProfile.barberAvailability?.[name] || {
        available: true,
        unavailableDates: []
      };
      return accumulator;
    }, {});
    const nextAttendance = names.reduce((accumulator, name) => {
      accumulator[name] = salonProfile.staffAttendance?.[name] !== false;
      return accumulator;
    }, {});

    setActionLoading("barbers-save");
    try {
      await updateDoc(doc(db, "salons", user.uid), {
        barbers: normalizedBarbers,
        barberAvailability: nextAvailability,
        staffAttendance: nextAttendance,
        updatedAt: serverTimestamp()
      });
      setBarberEditor(null);
      toast.success(successMessage);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Barber could not be saved."));
    } finally {
      setActionLoading("");
    }
  };

  const startBarberAdd = () => {
    setBarberEditor({
      mode: "add",
      originalName: "",
      name: "",
      imageUrl: "",
      imagePublicId: "",
      imageFile: null,
      imagePreview: "",
      active: true
    });
  };

  const startBarberEdit = (barber) => {
    setBarberEditor({
      mode: "edit",
      originalName: barber.name,
      name: barber.name,
      imageUrl: getSafeBarberImageUrl(barber.imageUrl),
      imagePublicId: barber.imagePublicId || "",
      imageFile: null,
      imagePreview: "",
      active: barber.active !== false
    });
  };

  const handleBarberImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid barber image.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be smaller than 8MB.");
      return;
    }

    setBarberEditor((value) => ({
      ...value,
      imageFile: file,
      imagePreview: URL.createObjectURL(file)
    }));
  };

  const saveBarberEditor = async () => {
    if (!barberEditor) return;
    const nextName = barberEditor.name.trim();
    if (!nextName) {
      toast.error("Barber name is required.");
      return;
    }
    const existingBarbers =
      profileBarbers.length
        ? profileBarbers
        : DEFAULT_BARBER_NAMES.map((name) => ({
            name,
            active: true,
            imageUrl: "",
            imagePublicId: ""
          }));
    const duplicate = existingBarbers.some(
      (barber) =>
        barber.name.toLowerCase() === nextName.toLowerCase() &&
        barber.name !== barberEditor.originalName
    );
    if (duplicate) {
      toast.error("A barber with this name already exists.");
      return;
    }

    setActionLoading("barbers-save");
    let imageUrl = barberEditor.imageUrl || "";
    let imagePublicId = barberEditor.imagePublicId || "";
    try {
      if (barberEditor.imageFile) {
        const uploadedImage = await uploadServiceImage(barberEditor.imageFile);
        imageUrl = uploadedImage.imageUrl;
        imagePublicId = uploadedImage.imagePublicId;
        if (
          barberEditor.imagePublicId &&
          barberEditor.imagePublicId !== uploadedImage.imagePublicId
        ) {
          await deleteCloudinaryImage(barberEditor.imagePublicId);
        }
      }
    } catch (error) {
      setActionLoading("");
      toast.error(getSafeErrorMessage(error, "Barber image could not be uploaded."));
      return;
    }

    const nextBarber = {
      name: nextName,
      active: barberEditor.active !== false,
      imageUrl,
      imagePublicId
    };
    const nextBarbers =
      barberEditor.mode === "add"
        ? [...existingBarbers, nextBarber]
        : existingBarbers.map((barber) =>
            barber.name === barberEditor.originalName
              ? nextBarber
              : barber
          );
    persistBarbers(
      nextBarbers,
      barberEditor.mode === "add" ? "Barber added." : "Barber updated."
    );
  };

  const deleteBarber = (name) => {
    const busy = activeDisplayQueue.some(
      (item) =>
        String(item.status || "").toLowerCase() === "in_chair" &&
        item.barberName === name
    );
    if (busy) {
      toast.error("This barber is currently serving a customer.");
      return;
    }
    const existingBarbers =
      profileBarbers.length
        ? profileBarbers
        : DEFAULT_BARBER_NAMES.map((barberName) => ({
            name: barberName,
            active: true,
            imageUrl: "",
            imagePublicId: ""
          }));
    const nextBarbers = existingBarbers.filter((barber) => barber.name !== name);
    const deletedBarber = existingBarbers.find((barber) => barber.name === name);
    persistBarbers(nextBarbers, "Barber deleted.");
    if (deletedBarber?.imagePublicId) {
      deleteCloudinaryImage(deletedBarber.imagePublicId).catch(() => {});
    }
  };

  const normalizeCoupons = (coupons) =>
    Object.entries(coupons).reduce((accumulator, [code, coupon]) => {
      const safeCode = String(code || "").trim().toUpperCase();
      if (!safeCode) return accumulator;
      const type = coupon.type === "amount" ? "amount" : "percent";
      const percent = Number(coupon.percent || 0);
      const amount = Number(coupon.amount || 0);
      if (type === "percent" && percent <= 0) return accumulator;
      if (type === "amount" && amount <= 0) return accumulator;
      accumulator[safeCode] = {
        label: coupon.label || safeCode,
        type,
        percent: type === "percent" ? percent : 0,
        amount: type === "amount" ? amount : 0,
        active: coupon.active !== false,
        condition: coupon.condition || "all",
        minAmount: Number(coupon.minAmount || 0),
        maxAmount: Number(coupon.maxAmount || 0)
      };
      return accumulator;
    }, {});

  const persistCoupons = async (nextCoupons, successMessage = "Coupons saved.") => {
    if (!user) return;
    setActionLoading("coupons-save");
    try {
      const normalizedCoupons = normalizeCoupons(nextCoupons);
      await updateDoc(doc(db, "salons", user.uid), {
        coupons: normalizedCoupons,
        updatedAt: serverTimestamp()
      });
      setCouponDraft(normalizedCoupons);
      setCouponEditor(null);
      toast.success(successMessage);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Coupons could not be saved."));
    } finally {
      setActionLoading("");
    }
  };

  const startCouponAdd = () => {
    setCouponEditor({
      mode: "add",
      originalCode: "",
      code: "",
      label: "",
      type: "percent",
      percent: 10,
      amount: 0,
      condition: "all",
      minAmount: 0,
      maxAmount: 0,
      active: true
    });
  };

  const startCouponEdit = (code, coupon) => {
    setCouponEditor({
      mode: "edit",
      originalCode: code,
      code,
      label: coupon.label || code,
      type: coupon.type === "amount" ? "amount" : "percent",
      percent: Number(coupon.percent || 0),
      amount: Number(coupon.amount || 0),
      condition: coupon.condition || "all",
      minAmount: Number(coupon.minAmount || 0),
      maxAmount: Number(coupon.maxAmount || 0),
      active: coupon.active !== false
    });
  };

  const saveCouponEditor = () => {
    if (!couponEditor) return;
    const safeCode = String(couponEditor.code || "").trim().toUpperCase();
    const type = couponEditor.type === "amount" ? "amount" : "percent";
    const percent = Number(couponEditor.percent || 0);
    const amount = Number(couponEditor.amount || 0);
    if (!safeCode) {
      toast.error("Coupon code is required.");
      return;
    }
    if (type === "percent" && percent <= 0) {
      toast.error("Set a valid percent discount.");
      return;
    }
    if (type === "amount" && amount <= 0) {
      toast.error("Set a valid amount discount.");
      return;
    }
    if (couponEditor.condition === "min" && Number(couponEditor.minAmount || 0) <= 0) {
      toast.error("Set a valid minimum price.");
      return;
    }
    if (couponEditor.condition === "max" && Number(couponEditor.maxAmount || 0) <= 0) {
      toast.error("Set a valid maximum price.");
      return;
    }
    const nextCoupons = { ...couponDraft };
    if (couponEditor.originalCode && couponEditor.originalCode !== safeCode) {
      delete nextCoupons[couponEditor.originalCode];
    }
    nextCoupons[safeCode] = {
      label: couponEditor.label || safeCode,
      type,
      percent: type === "percent" ? percent : 0,
      amount: type === "amount" ? amount : 0,
      active: couponEditor.active !== false,
      condition: couponEditor.condition || "all",
      minAmount: Number(couponEditor.minAmount || 0),
      maxAmount: Number(couponEditor.maxAmount || 0)
    };
    persistCoupons(
      nextCoupons,
      couponEditor.mode === "add" ? "Coupon added." : "Coupon updated."
    );
  };

  const deleteCoupon = (code) => {
    const nextCoupons = { ...couponDraft };
    delete nextCoupons[code];
    persistCoupons(nextCoupons, "Coupon deleted.");
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
      barberName: customer.barberName || "Next available barber",
      bookingDate: customer.bookingDate,
      timeSlot: customer.timeSlot || salonTimeSlots[0]?.value || "",
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
      barberName: "Next available barber",
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
          salonTimeSlots.find((slot) => slot.value === effectiveTimeSlot) ||
          salonTimeSlots[0];
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
        const bookingRef = doc(collection(db, "customers"));
        const createdSort = Date.now();
        let createdTurn = "-";

        await runTransaction(db, async (transaction) => {
          const counterRef = doc(db, "bookingCounters", bookingDate);
          const counterSnapshot = await transaction.get(counterRef);
          const counter = counterSnapshot.exists() ? counterSnapshot.data() : {};
          const confirmedCount = counterSnapshot.exists()
            ? Number(counter.confirmedCount || 0)
            : Number(
                queueItems.filter(
                  (booking) =>
                    booking.bookingDate === bookingDate &&
                    confirmedBookingStatuses.has(
                      String(booking.status || "").toLowerCase()
                    )
                ).length || 0
              );
          const slotCounts = counterSnapshot.exists()
            ? { ...(counter.slotCounts || {}) }
            : {
                [selectedSlot?.value || ""]: slotConfirmedCount
              };
          const selectedSlotValue = selectedSlot?.value || "";
          const currentSlotCount = Number(slotCounts[selectedSlotValue] || 0);
          const countsTowardQueue = confirmedBookingStatuses.has(
            String(selectedStatus).toLowerCase()
          );

          if (countsTowardQueue && currentSlotCount >= STAFF_COUNT) {
            throw new Error(
              "This time slot already has 3 bookings. Please choose another slot."
            );
          }

          createdTurn = countsTowardQueue ? confirmedCount + 1 : "-";

          transaction.set(bookingRef, {
            name: bookingDraft.name.trim() || matchedUser.name,
            mobile: bookingDraft.mobile.trim() || matchedUser.phone,
            email: matchedUser.email,
            service: bookingDraft.service.trim(),
            barberName: bookingDraft.barberName || "Next available barber",
            bookingDate,
            bookingDay: bookingDate === toDateInputValue(new Date()) ? "today" : "",
            bookingLabel:
              bookingDate === toDateInputValue(new Date()) ? "Today" : "Scheduled",
            bookingDisplayDate: getDisplayDate(bookingDate),
            timeSlot: selectedSlotValue,
            timeSlotLabel: selectedSlot?.label || "",
            token: countsTowardQueue ? createdTurn : 0,
            peopleAhead: countsTowardQueue ? createdTurn - 1 : 0,
            queuePosition: countsTowardQueue ? createdTurn : 0,
            turnSortMinutes: getBookingSortMinutes({
              bookingDate,
              timeSlot: selectedSlotValue,
              createdSort
            }),
            status: selectedStatus,
            amount: Number(bookingDraft.amount || 0),
            platformFee: PLATFORM_FEE_PER_PERSON,
            payableAmount: Number(bookingDraft.amount || 0) + PLATFORM_FEE_PER_PERSON,
            refundableAmount: Number(bookingDraft.amount || 0),
            nonRefundableFee: PLATFORM_FEE_PER_PERSON,
            paymentProvider: "admin",
            paymentStatus: "admin_created",
            userId: matchedUser.id,
            source: "admin-booking",
            createdSort,
            arrivalNote:
              "Please reach the salon 40 minutes before your turn for a quicker haircut. Cancel your booking if you cannot visit.",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          if (countsTowardQueue && selectedSlotValue) {
            slotCounts[selectedSlotValue] = currentSlotCount + 1;
          }

          transaction.set(
            counterRef,
            {
              bookingDate,
              confirmedCount: countsTowardQueue
                ? confirmedCount + 1
                : confirmedCount,
              slotCounts,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
        });

        setAdminBookingMode(false);
        setBookingDraft(null);
        toast.success(`Admin booking created. Turn #${createdTurn}.`);
        setActionLoading("");
        return;
      }

      const selectedSlot =
        salonTimeSlots.find((slot) => slot.value === effectiveTimeSlot) ||
        salonTimeSlots[0];
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
        barberName: bookingDraft.barberName || "Next available barber",
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
      toast.error(getSafeErrorMessage(error, "Unable to update booking."));
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
      toast.error(getSafeErrorMessage(error, "Unable to delete booking."));
    } finally {
      setActionLoading("");
    }
  };

  const deleteSelectedBookings = async () => {
    if (!selectedBookings.length) return;

    setActionLoading("booking-bulk-delete");
    try {
      const affectedDates = [...new Set(selectedBookings.map((booking) => booking.bookingDate).filter(Boolean))];
      const batch = writeBatch(db);
      selectedBookings.forEach((booking) => {
        batch.delete(doc(db, "customers", booking.id));
      });
      await batch.commit();
      await Promise.all(
        affectedDates.map(async (bookingDate) => {
          await promoteNextWaitlist(bookingDate);
          await reindexQueueDate(bookingDate);
        })
      );
      setSelectedBookingIds([]);
      setConfirmDialog(null);
      toast.success(`${selectedBookings.length} bookings deleted.`);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Selected bookings could not be deleted."));
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
      toast.error(getSafeErrorMessage(error, "Unable to save haircut design."));
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
      toast.error(getSafeErrorMessage(error, "Unable to delete haircut design."));
    } finally {
      setActionLoading("");
    }
  };

  const deleteSelectedServices = async () => {
    if (!selectedServices.length) return;

    setActionLoading("service-bulk-delete");
    try {
      await Promise.all(
        selectedServices
          .filter((service) => service.imagePublicId)
          .map((service) => deleteCloudinaryImage(service.imagePublicId))
      );
      const batch = writeBatch(db);
      selectedServices.forEach((service) => {
        batch.delete(doc(db, "services", service.id));
      });
      await batch.commit();
      setSelectedServiceIds([]);
      setConfirmDialog(null);
      toast.success(`${selectedServices.length} services deleted.`);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Selected services could not be deleted."));
    } finally {
      setActionLoading("");
    }
  };

  const deleteRefundRequest = async (refund) => {
    if (!refund?.id) return;

    const loadingKey = `refund-${refund.id}-delete`;
    setActionLoading(loadingKey);
    try {
      await deleteDoc(doc(db, "refundRequests", refund.id));
      setSelectedRefundIds((ids) => ids.filter((id) => id !== refund.id));
      setConfirmDialog(null);
      toast.success("Refund request deleted.");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Refund request could not be deleted."));
    } finally {
      setActionLoading("");
    }
  };

  const deleteSelectedRefunds = async () => {
    if (!selectedRefunds.length) return;

    setActionLoading("refund-bulk-delete");
    try {
      const batch = writeBatch(db);
      selectedRefunds.forEach((refund) => {
        batch.delete(doc(db, "refundRequests", refund.id));
      });
      await batch.commit();
      setSelectedRefundIds([]);
      setConfirmDialog(null);
      toast.success(`${selectedRefunds.length} refund requests deleted.`);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Selected refund requests could not be deleted."));
    } finally {
      setActionLoading("");
    }
  };

  const updateUserBlockStatus = async (customer) => {
    if (!customer?.id) return;

    const nextBlocked = !customer.blocked;
    const loadingKey = `user-${customer.id}-block`;
    setActionLoading(loadingKey);
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`${API_URL}/api/admin/users/${customer.uid || customer.id}/block`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader
        },
        body: JSON.stringify({ blocked: nextBlocked })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "User block status could not be updated.");
      }

      toast.success(
        nextBlocked
          ? `${customer.name} is blocked from booking.`
          : `${customer.name} can book again.`
      );
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "User block status could not be updated.")
      );
    } finally {
      setActionLoading("");
    }
  };

  const deleteUserAndRelatedData = async (customer) => {
    if (!customer?.id) return;

    const loadingKey = `user-${customer.id}-delete`;
    setActionLoading(loadingKey);
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`${API_URL}/api/admin/users/${customer.uid || customer.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeader
        },
        body: JSON.stringify({
          email: customer.email,
          phone: customer.phone
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "User related data could not be deleted.");
      }

      setConfirmDialog(null);
      toast.success(
        `${customer.name} deleted with ${data.deletedDocs || 0} related records.`
      );
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "User related data could not be deleted.")
      );
    } finally {
      setActionLoading("");
    }
  };

  const updateRefundStatus = async (refund, status) => {
    const loadingKey = `refund-${refund.id}-${status}`;
    setActionLoading(loadingKey);
    try {
      const adminRefundNote =
        status === "rejected"
          ? window.prompt("Reason visible to customer:", refund.adminRefundNote || "")
          : status === "reviewing"
            ? "Admin is reviewing your refund request."
            : status === "processing"
              ? "Refund has been initiated and is waiting for payment provider confirmation."
              : status === "completed"
                ? "Refund completed to the original payment method."
                : refund.adminRefundNote || "";

      if (status === "rejected" && adminRefundNote === null) {
        setActionLoading("");
        return;
      }

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
            adminRefundNote,
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
        adminRefundNote,
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
      toast.error(getSafeErrorMessage(error, "Unable to update refund request."));
    } finally {
      setActionLoading("");
    }
  };

  const syncCashfreeRefundStatus = async (refund) => {
    const loadingKey = `refund-${refund.id}-sync`;
    setActionLoading(loadingKey);
    try {
      if (!refund.orderId || refund.orderId === "-") {
        throw new Error("Cashfree order ID is required to check refund status.");
      }

      const authHeader = await getAuthHeader();
      const response = await fetch(`${API_URL}/api/customer-payments/cashfree/refund/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader
        },
        body: JSON.stringify({
          refundRequestId: refund.id,
          orderId: refund.orderId
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Cashfree refund status could not be checked.");
      }

      toast.success(
        data.status === "completed"
          ? "Refund completed in Cashfree. "
          : `Cashfree refund status synced: ${statusLabel(data.status)}.`
      );
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Unable to sync Cashfree refund status."));
    } finally {
      setActionLoading("");
    }
  };

  const handleRefundDropdownAction = (refund, action) => {
    if (!refund || !action) return;

    if (action === "sync") {
      syncCashfreeRefundStatus(refund);
      return;
    }

    if (action === "delete") {
      setConfirmDialog({
        title: "Delete refund request?",
        message: `Refund request for ${refund.customerName} will be permanently deleted from admin records.`,
        confirmLabel: "Delete",
        loadingKey: `refund-${refund.id}-delete`,
        onConfirm: () => deleteRefundRequest(refund)
      });
      return;
    }

    updateRefundStatus(refund, action);
  };

  const isRefundActionLoading = (refund) =>
    Boolean(refund?.id && actionLoading.startsWith(`refund-${refund.id}-`));

  const callNextCustomer = () => {
    const busyBarbers = activeDisplayQueue
      .filter((item) => String(item.status || "").toLowerCase() === "in_chair")
      .map((item) => item.barberName)
      .filter(Boolean);
    const idleAvailableBarbers = todayBarberAvailability
      .filter((barber) => barber.available && !busyBarbers.includes(barber.name))
      .map((barber) => barber.name);
    const nextCustomer = activeDisplayQueue.find((item) => {
      if (item.status !== "waiting") return false;
      if (!idleAvailableBarbers.length) return false;
      if (!item.barberName || item.barberName === "Next available barber") return true;
      return idleAvailableBarbers.includes(item.barberName);
    });
    if (!nextCustomer) {
      setNotice("No eligible waiting customer or free barber chair found.");
      toast.info("No eligible waiting customer or free barber chair found.");
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
          salonTimeSlots[Math.floor(transferIndex / STAFF_COUNT)] ||
          salonTimeSlots[salonTimeSlots.length - 1];

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
      toast.error(getSafeErrorMessage(error, "Day close transfer failed."));
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

  const exportDailySalesReport = () => {
    const today = toDateInputValue(new Date());
    const todaysItems = analyticsItems.filter((item) => item.bookingDate === today);
    const headers = [
      "Token",
      "Customer",
      "Mobile",
      "Service",
      "Barber",
      "Payment",
      "Status",
      "Amount",
      "Cashfree Fee"
    ];
    const rows = todaysItems.map((item) => [
      item.token,
      item.name,
      item.phone,
      item.service || "",
      item.barberName || "",
      statusLabel(item.paymentStatus),
      statusLabel(item.status),
      item.amount || 0,
      item.cashfreeFee || 0
    ]);
    const totals = [
      "",
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      todaysItems.reduce((total, item) => total + Number(item.amount || 0), 0),
      todaysItems.reduce((total, item) => total + Number(item.cashfreeFee || 0), 0)
    ];
    const csv = [headers, ...rows, totals]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daily-sales-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveSalonSettings = async (event) => {
    event.preventDefault();
    setNotice("");
    const openingMinutes = parseTimeToMinutes(settingsDraft.openingTime, SLOT_START_HOUR);
    const closingMinutes = parseTimeToMinutes(settingsDraft.closingTime, BOOKING_END_HOUR);
    if (closingMinutes <= openingMinutes) {
      const message = "Closing time must be after opening time.";
      setNotice(message);
      toast.error(message);
      return;
    }

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
      const message = getSafeErrorMessage(error, "Unable to save salon settings.");
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
      toast.error(getSafeErrorMessage(error, "Unable to update shop status."));
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
          getSafeErrorMessage(
            error,
            "Salon profile save failed, payment checkout will still continue."
          )
        );
      });

      const order = await createSubscriptionOrder({ salonId, ownerId }).unwrap();

      if (!order?.id || !order?.key_id) {
        throw new Error("Razorpay order response is missing checkout details.");
      }

      setSubscriptionStatus("Razorpay checkout opened. Payment is pending.");
      toast.info("Payment pending. Complete Razorpay checkout to activate premium.");

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
            const paymentHelp = `${message} If money was debited, wait for provider/bank auto-reversal or contact support with your Razorpay payment/order ID.`;
            setSubscriptionStatus(paymentHelp);
            toast.error(paymentHelp);
          } finally {
            setSubscriptionLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubscriptionStatus("Payment is pending or was cancelled before completion.");
            toast.warning("Payment pending/cancelled. Premium is not active until payment succeeds.");
            setSubscriptionLoading(false);
          }
        }
      });

      checkout.open();
    } catch (error) {
      const message = getRequestErrorMessage(error, "Subscription failed");
      const paymentHelp = `${message} If money was debited, wait for provider/bank auto-reversal or contact support with your Razorpay payment/order ID.`;
      setSubscriptionStatus(paymentHelp);
      toast.error(paymentHelp);
    } finally {
      setSubscriptionLoading(false);
    }
  };


  const emailAllowed =
    user?.email &&
    ADMIN_ALLOWED_EMAILS.includes(user.email.trim().toLowerCase());

  const shellProps = {
    navItems,
    activePage,
    navigateAdminPage,
    openMessageCount,
    actionLoading,
    handleLogout,
    setMobileMenuOpen,
    activeNavItem,
    salonProfile,
    shopManuallyClosed,
    activeQueueItems,
    tomorrowBookingCount,
    setUserSearchTerm,
    userSearchTerm,
    user,
    mobileMenuOpen,
    notice,
    UsersRound,
    waitingCount,
    PhoneCall,
    inChairCount,
    UserCheck,
    completedCount,
    Clock3,
    getDisplayDate,
    tomorrowQueueDate,
    hasWeeklyFlow,
    weeklyFlowData,
    dashboardSummary,
    hasRevenueChart,
    revenueChartData,
    hasServiceSplit,
    serviceSplitData,
    hasHourlyRush,
    hourlyRushData,
    hasQueueStatus,
    queueStatusChartData,
    hasPaymentMethods,
    paymentMethodChartData,
    hasRefundStatuses,
    refundStatusChartData,
    currentCustomer,
    statusTone,
    statusLabel,
    callNextCustomer,
    updateCustomerStatus,
    exportQueue,
    exportDailySalesReport,
    openAdminBookingDialog,
    closeDayAndTransferBookings,
    selectedQueueTab,
    queueTabDragScroll,
    queueStatusTabs,
    todaysQueueItems,
    queueStatusTab,
    setQueueStatusTab,
    filteredQueue,
    bookingPageAllSelected,
    togglePageSelection,
    setSelectedBookingIds,
    paginatedBookingIds,
    selectedBookingIds,
    setConfirmDialog,
    selectedBookings,
    deleteSelectedBookings,
    paginatedQueue,
    activeTransferStatuses,
    setDraggedQueueId,
    reorderQueueBooking,
    draggedQueueId,
    toggleSelection,
    canCallCustomer,
    notifyTurnNear,
    openBookingEditor,
    deleteBooking,
    setQueuePage,
    safeQueuePage,
    queueTotalPages,
    queueLoading,
    todayBarberAvailability,
    profileBarberNames,
    barberEditor,
    startBarberAdd,
    handleBarberImageChange,
    setBarberEditor,
    saveBarberEditor,
    profileBarbers,
    barberRatingSummary,
    DEFAULT_BARBER_PLACEHOLDERS,
    startBarberEdit,
    deleteBarber,
    inChairByBarber,
    setStaffAvailabilityDate,
    staffAvailabilityDate,
    selectedDateBarberAvailability,
    updateStaffAttendance,
    couponEditor,
    startCouponAdd,
    setCouponEditor,
    saveCouponEditor,
    couponDraft,
    startCouponEdit,
    deleteCoupon,
    serviceItems,
    openAddServiceDialog,
    servicePageAllSelected,
    setSelectedServiceIds,
    paginatedServiceIds,
    selectedServiceIds,
    selectedServices,
    deleteSelectedServices,
    paginatedServices,
    setPhotoPreviewService,
    editService,
    deleteService,
    safeServicePage,
    SERVICE_PAGE_SIZE,
    setServicePage,
    serviceTotalPages,
    refundRequests,
    refundPageAllSelected,
    setSelectedRefundIds,
    paginatedRefundIds,
    selectedRefundIds,
    selectedRefunds,
    deleteSelectedRefunds,
    paginatedRefunds,
    isRefundActionLoading,
    handleRefundDropdownAction,
    refundsLoading,
    setRefundPage,
    safeRefundPage,
    refundTotalPages,
    filteredUsers,
    googleUsers,
    deleteUserAndRelatedData,
    updateUserBlockStatus,
    paginatedUsers,
    registeredUsers,
    safeUsersPage,
    setUsersPage,
    usersLoading,
    usersTotalPages,
    usersWithPhone,
    copyPublicLink,
    publicQueueLink,
    formatDateTime,
    handlePremiumSubscribe,
    premiumActive,
    premiumUntilDate,
    subscriptionLoading,
    subscriptionStatus,
    saveSalonSettings,
    setSettingsDraft,
    settingsDraft,
    toggleShopClosed,
    serviceDraft,
    editingServiceId,
    resetServiceForm,
    setServiceDraft,
    handleServiceImageChange,
    saveService,
    serviceDialogOpen,
    adminBookingDateValue,
    bookingDraft,
    adminBookingMode,
    setEditingBookingId,
    setAdminBookingMode,
    setBookingDraft,
    getAdminBookableSlots,
    saveBookingEdit,
    adminBookingTimeSlotValue,
    adminBookingSlots,
    todayDateValue,
    photoPreviewService,
    confirmDialog
  };


  return {
    actionLoading,
    authError,
    authLoading,
    emailAllowed,
    handleGoogleLogin,
    handleLogout,
    shellProps,
    user
  };
}
