import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Toaster, toast } from "sonner";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "firebase/auth";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query as firestoreQuery,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import { X } from "lucide-react";
import { auth, db, googleProvider } from "./lib/firebase.js";
import { getSafeErrorMessage } from "./lib/errors.js";
import {
  ConfirmDialog,
  useBodyScrollLock
} from "./components/common.jsx";
import {
  Header,
  PageSkeleton,
  ScrollPercentBadge
} from "./components/layout.jsx";
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
import { defaultServices } from "./lib/services.js";
import {
  activeBookingStatuses,
  BOOKING_CLOSED_MESSAGE,
  DEFAULT_BARBER_NAMES,
  DEFAULT_COUPONS,
  getBookingWindowMessage,
  isCustomerBookingWindowOpen,
  normalizeBarberAvailability,
  normalizeQueueItem,
  normalizeService,
  SALON_SLUG,
  sortBookingsForTurns,
  toDateInputValue
} from "./lib/bookingFlow.js";
import { BarbersPage, BookingPage, HomePage } from "./pages/bookingPages.jsx";

const CLIENT_LIVE_QUEUE_LIMIT = 80;
const CLIENT_SERVICES_LIMIT = 50;
const USER_PHOTO_CACHE_PREFIX = "ssq:cloudinary-profile-photo:";

const readCachedUserPhoto = (uid) => {
  if (!uid || typeof window === "undefined") return "";
  try {
    return localStorage.getItem(`${USER_PHOTO_CACHE_PREFIX}${uid}`) || "";
  } catch {
    return "";
  }
};

const readCachedUserPhotoByEmail = (email) => {
  if (!email || typeof window === "undefined") return "";
  try {
    return localStorage.getItem(`${USER_PHOTO_CACHE_PREFIX}email:${email}`) || "";
  } catch {
    return "";
  }
};

const cacheUserPhoto = (uid, photoURL) => {
  if (!uid || !photoURL || typeof window === "undefined") return;
  try {
    localStorage.setItem(`${USER_PHOTO_CACHE_PREFIX}${uid}`, photoURL);
  } catch {
    // Local storage can be unavailable in private browsing; Firestore remains the source.
  }
};

const cacheUserPhotoByEmail = (email, photoURL) => {
  if (!email || !photoURL || typeof window === "undefined") return;
  try {
    localStorage.setItem(`${USER_PHOTO_CACHE_PREFIX}email:${email}`, photoURL);
  } catch {
    // Local storage can be unavailable in private browsing; Firestore remains the source.
  }
};

const lazyPage = (loader, exportName) =>
  React.lazy(() =>
    loader().then((module) => ({
      default: module[exportName]
    }))
  );

const ProfilePage = lazyPage(() => import("./pages/ProfilePage.jsx"), "ProfilePage");
const CheckoutModal = lazyPage(
  () => import("./components/CheckoutModal.jsx"),
  "CheckoutModal"
);
const AboutPage = lazyPage(() => import("./pages/staticPages.jsx"), "AboutPage");
const ContactPage = lazyPage(() => import("./pages/staticPages.jsx"), "ContactPage");
const FaqPage = lazyPage(() => import("./pages/staticPages.jsx"), "FaqPage");
const GalleryPage = lazyPage(() => import("./pages/staticPages.jsx"), "GalleryPage");
const LegalPage = lazyPage(() => import("./pages/staticPages.jsx"), "LegalPage");
const PricingPage = lazyPage(() => import("./pages/staticPages.jsx"), "PricingPage");
const ServiceSeoPage = lazyPage(() => import("./pages/staticPages.jsx"), "ServiceSeoPage");
const StaffPage = lazyPage(() => import("./pages/staticPages.jsx"), "StaffPage");

function ClientToaster() {
  if (typeof document === "undefined") return null;

  return createPortal(
    <Toaster
      position="top-center"
      className="app-toaster"
      offset="18px"
      richColors
      closeButton
      toastOptions={{
        style: {
          borderRadius: "18px",
          border: "1px solid #35201f",
          boxShadow: "0 18px 60px rgba(0, 0, 0, 0.28)",
          zIndex: 2147483647
        }
      }}
    />,
    document.body
  );
}

export function App() {
  const initialRoute = getClientRoute();
  const [page, setPage] = useState(initialRoute.page);
  const [user, setUser] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [cachedPhotoURL, setCachedPhotoURL] = useState("");
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
  const userProfilePersistRef = useRef("");

  useBodyScrollLock(Boolean(photoPreviewService));

  useRevealOnScroll(page);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      const photoURL =
        readCachedUserPhoto(currentUser?.uid) ||
        readCachedUserPhotoByEmail(currentUser?.email);
      if (currentUser?.uid && photoURL) {
        cacheUserPhoto(currentUser.uid, photoURL);
        cacheUserPhotoByEmail(currentUser.email, photoURL);
      }
      setCachedPhotoURL(photoURL || "");
      setUser(currentUser);
      setAuthLoading(false);
      setLoginLoading(false);
      setLogoutLoading(false);

    });
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setUserAccount(null);
      setCachedPhotoURL("");
      return undefined;
    }

    return onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        const account = snapshot.exists() ? snapshot.data() : null;
        const hasCloudinaryPhoto = account?.profilePhotoSource === "cloudinary";
        const photoURL = hasCloudinaryPhoto
          ? account?.photoURL ||
            account?.photoUrl ||
            account?.profilePhotoURL ||
            readCachedUserPhoto(user.uid) ||
            readCachedUserPhotoByEmail(user.email)
          : "";
        if (photoURL) {
          cacheUserPhoto(user.uid, photoURL);
          cacheUserPhotoByEmail(user.email, photoURL);
          setCachedPhotoURL(photoURL);
        } else {
          setCachedPhotoURL("");
        }
        setUserAccount(account);
      },
      () => setUserAccount(null)
    );
  }, [user?.email, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const name = user.displayName || user.email?.split("@")[0] || "Customer";
    const persistKey = `${user.uid}|${user.email || ""}|${name}`;
    if (userProfilePersistRef.current === persistKey) return;
    userProfilePersistRef.current = persistKey;

    const patch = {
      uid: user.uid,
      email: user.email || "",
      name,
      updatedAt: serverTimestamp()
    };

    setDoc(doc(db, "users", user.uid), patch, { merge: true }).catch(() => {});
  }, [user]);

  const displayUser = useMemo(() => {
    if (!user) return null;
    const hasCloudinaryPhoto = userAccount?.profilePhotoSource === "cloudinary";
    const savedPhotoURL = hasCloudinaryPhoto
      ? userAccount?.photoURL || userAccount?.photoUrl || userAccount?.profilePhotoURL || ""
      : "";
    const storedPhotoURL =
      cachedPhotoURL ||
      readCachedUserPhoto(user.uid) ||
      readCachedUserPhotoByEmail(user.email);
    const fallbackPhotoURL = userAccount ? "" : storedPhotoURL;
    return {
      uid: user.uid,
      email: user.email || userAccount?.email || "",
      displayName:
        user.displayName ||
        userAccount?.name ||
        userAccount?.displayName ||
        user.email?.split("@")[0] ||
        "Customer",
      photoURL: savedPhotoURL || fallbackPhotoURL,
      photoUrl: savedPhotoURL || fallbackPhotoURL,
      profilePhotoSource: hasCloudinaryPhoto ? "cloudinary" : "",
      profilePhotoUpdatedAt: userAccount?.profilePhotoUpdatedAt || null,
      providerData: []
    };
  }, [cachedPhotoURL, user, userAccount]);

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
      where("bookingDate", "==", today),
      where("status", "in", [...activeBookingStatuses]),
      limit(CLIENT_LIVE_QUEUE_LIMIT)
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
              ? "Next Live Turn"
              : "First Available Turn",
          tokenHint: currentBooking
            ? "Customer in chair"
            : nextWaitingBooking
              ? `${waitingBookings.length} waiting in live queue`
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
          tokenLabel: "Next Live Turn",
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
      collection(db, "services"),
      limit(CLIENT_SERVICES_LIMIT)
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
    if (page === "booking") {
      setScrollProgress(0);
      setScrollBadgeVisible(false);
      return undefined;
    }

    let hideTimer;
    let rafId = 0;
    let lastProgress = -1;

    const updateScrollProgress = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const scrollTop =
          window.scrollY || document.documentElement.scrollTop || 0;
        const scrollHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const nextProgress =
          scrollHeight <= 0 ? 0 : Math.min(100, (scrollTop / scrollHeight) * 100);
        if (Math.abs(nextProgress - lastProgress) >= 1) {
          lastProgress = nextProgress;
          setScrollProgress(nextProgress);
        }
        setScrollBadgeVisible(true);
        window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => setScrollBadgeVisible(false), 900);
      });
    };

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
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
      const result = await signInWithPopup(auth, googleProvider);
      await result.user.reload();
      const freshUser = auth.currentUser || result.user;
      await setDoc(
        doc(db, "users", freshUser.uid),
        {
          uid: freshUser.uid,
          email: freshUser.email || "",
          name:
            freshUser.displayName ||
            freshUser.email?.split("@")[0] ||
            "Customer",
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setUser(freshUser);
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

  const handleBookingSuccess = (result = {}) => {
    setSelectedService(null);
    navigatePage("my-bookings");
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success(
        result.toastMessage ||
          "Booking confirmed. You can view it in My Bookings."
      );
    }, 180);
  };

  if (authLoading) {
    return <PageSkeleton />;
  }

  return (
    <>
    <ClientToaster />
    <main className="min-h-screen bg-[#06100e] pb-24 text-[#f4fbf8] lg:pb-0">
      <Header
        onLogin={login}
        authLoading={authLoading}
        loginLoading={loginLoading}
        onNavigate={navigatePage}
        page={page}
        routeProgress={routeProgress}
        routeProgressActive={routeProgressActive}
        scrollProgress={scrollProgress}
        user={displayUser}
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
            user={displayUser}
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
            user={displayUser}
          />
        ) : null}
        {page === "barbers" ? <BarbersPage bookingGate={bookingGate} /> : null}
        {page === "about" ? <AboutPage /> : null}
        {page === "contact" ? <ContactPage user={displayUser} /> : null}
        {page === "pricing" ? <PricingPage /> : null}
        {page === "gallery" ? <GalleryPage /> : null}
        {page === "staff" ? <StaffPage /> : null}
        {page === "faq" ? <FaqPage /> : null}
        {serviceSeoPages.includes(page) ? <ServiceSeoPage page={page} /> : null}
        {legalPages.includes(page) ? <LegalPage page={page} /> : null}
        {page === "profile" ? (
          <ProfilePage
            bookingGate={bookingGate}
            loginLoading={loginLoading}
            logoutLoading={logoutLoading}
            onMyBookings={() => navigatePage("my-bookings")}
            onLogin={login}
            onLogout={requestLogout}
            user={displayUser}
          />
        ) : null}
        {page === "my-bookings" ? (
          <ProfilePage
            bookingsOnly
            bookingGate={bookingGate}
            loginLoading={loginLoading}
            logoutLoading={logoutLoading}
            onLogin={login}
            onLogout={requestLogout}
            user={displayUser}
          />
        ) : null}
      </Suspense>
      {selectedService ? (
        <Suspense fallback={null}>
          <CheckoutModal
            bookingGate={bookingGate}
            onBookingSuccess={handleBookingSuccess}
            onClose={() => setSelectedService(null)}
            service={selectedService}
            user={displayUser}
            userAccount={userAccount}
          />
        </Suspense>
      ) : null}
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
    </>
  );
}
