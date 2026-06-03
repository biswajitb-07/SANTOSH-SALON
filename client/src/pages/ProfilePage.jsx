import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { updateProfile } from "firebase/auth";
import {
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  query as firestoreQuery,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import {
  CalendarClock,
  CalendarCheck2,
  Camera,
  Clock3,
  Download,
  Eye,
  Gift,
  LogIn,
  LogOut,
  Share2,
  Star,
  Upload,
  UserRound,
  X
} from "lucide-react";
import {
  ButtonSpinner,
  PaginationControls,
  UserAvatar,
  useBodyScrollLock
} from "../components/common.jsx";
import {
  CancelReasonDialog,
  RefundStatusTracker,
  RescheduleDialog
} from "../components/ProfileDialogs.jsx";
import { auth, db } from "../lib/firebase.js";
import { getSafeErrorMessage } from "../lib/errors.js";
import {
  formatBookingStatus,
  formatMoney,
  formatStatus
} from "../lib/formatters.js";
import {
  downloadBookingInvoice,
  shareBookingInvoice as shareBookingInvoiceFile
} from "../lib/invoice.js";
import {
  createTimeSlots,
  getBookingDayStats,
  getVisibleTimeSlots,
  ONLINE_BOOKING_START_HOUR
} from "../lib/bookingFlow.js";

const BOOKING_PAGE_SIZE = 5;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STAFF_COUNT = 3;
const PROFILE_PHOTO_MAX_BYTES = 300 * 1024;
const PROFILE_PHOTO_CHANGE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const PLATFORM_FEE_PER_PERSON = 2;
const SERVICE_ESTIMATE_MINUTES = {
  haircut: 25,
  beard: 15,
  facial: 40,
  wash: 20,
  color: 60,
  default: 25
};
const queueCountStatuses = new Set(["confirmed", "waiting", "in_chair"]);
const editableBookingStatuses = ["confirmed", "waiting", "waitlist"];
const liveBookingStatuses = new Set(["confirmed", "waiting", "waitlist", "in_chair"]);

const getBarberStatsId = (barberName = "") =>
  String(barberName || "barber")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "barber";

const isCloudinaryUrl = (value = "") =>
  String(value || "").includes("res.cloudinary.com");

const getCloudinaryProfilePhotoUrl = (account = {}) => {
  const imageUrl = account?.photoURL || account?.photoUrl || account?.profilePhotoURL || "";
  if (!imageUrl) return "";
  if (account?.profilePhotoSource === "cloudinary") return imageUrl;
  if (account?.profilePhotoPublicId) return imageUrl;
  return isCloudinaryUrl(imageUrl) ? imageUrl : "";
};

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
  if (isPastActiveBooking(booking)) return "Reschedule needed";
  if (booking.status === "waitlist") return "Admin will confirm your slot";
  if (booking.status === "confirmed") return "Slot confirmed";
  if (!["waiting", "in_chair"].includes(booking.status)) return "-";
  if (booking.status === "in_chair") return "Serving now";
  const estimate =
    Math.ceil(Number(booking.peopleAhead || 0) / STAFF_COUNT) *
    getServiceEstimateMinutes(booking.service);
  return estimate <= 0 ? "Your turn is near" : `${estimate} min approx`;
};

const getLivePositionText = (booking) => {
  if (!booking) return "-";
  if (isPastActiveBooking(booking)) return "Reschedule needed";
  if (booking.status === "waitlist") return "Waiting list";
  if (booking.status === "in_chair") return "You are in chair now";
  if (!liveBookingStatuses.has(booking.status)) return "-";

  const peopleAhead = Math.max(0, Number(booking.peopleAhead || 0));
  return peopleAhead === 0
    ? "Aapke aage 0 log hain. Your turn is near."
    : `Aapke aage ${peopleAhead} log hain.`;
};

const getEstimatedTurnLabel = (booking) => {
  if (!booking) return "Estimated turn";
  if (isPastActiveBooking(booking)) return "Reschedule needed";
  if (booking.status === "waitlist") return "Waiting list";
  const token = booking.token && booking.token !== "-" ? `#${booking.token}` : "";
  return `Estimated turn ${token}`.trim();
};

const isPastActiveBooking = (booking) =>
  Boolean(
    booking?.bookingDate &&
      booking.bookingDate < toDateInputValue(new Date()) &&
      liveBookingStatuses.has(String(booking.status || "").toLowerCase())
  );

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
    bookingDate: data.bookingDate || "",
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

const getSnapshotMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value.toMillis) return value.toMillis();
  if (value.toDate) return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.readAsDataURL(file);
  });

const getProfilePhotoChangedAt = (user) =>
  getSnapshotMillis(user?.profilePhotoUpdatedAt);

const formatProfilePhotoLock = (millis) => {
  if (!millis) return "Upload your own photo. Google photo is not used.";
  const nextAllowedAt = new Date(millis + PROFILE_PHOTO_CHANGE_WINDOW_MS);
  return `Users can change photo once every 2 days. Next safe change: ${nextAllowedAt.toLocaleString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }
  )}.`;
};

const sortRefundRequests = (refunds) =>
  [...refunds].sort(
    (first, second) =>
      getSnapshotMillis(second.createdAt || second.updatedAt) -
      getSnapshotMillis(first.createdAt || first.updatedAt)
  );

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

export function ProfilePage({
  bookingGate = {},
  bookingsOnly = false,
  loginLoading,
  logoutLoading,
  onMyBookings,
  onLogin,
  onLogout,
  onProfilePhotoUpdated,
  user
}) {
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [refundRequests, setRefundRequests] = useState([]);
  const [cancelBookingId, setCancelBookingId] = useState("");
  const [pendingCancelBooking, setPendingCancelBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleBookingId, setRescheduleBookingId] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const [selectedBookingGroupKey, setSelectedBookingGroupKey] = useState("");
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [selectedProfilePhotoFile, setSelectedProfilePhotoFile] = useState(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState("");
  const [profileAccount, setProfileAccount] = useState(null);
  const profilePhotoInputRef = useRef(null);
  const onProfilePhotoUpdatedRef = useRef(onProfilePhotoUpdated);
  const groupedBookings = groupUserBookings(bookings).slice(0, 5);
  const displayUser = useMemo(() => {
    if (!user) return null;
    const accountPhotoUrl = getCloudinaryProfilePhotoUrl(profileAccount);
    const userPhotoUrl = getCloudinaryProfilePhotoUrl(user);
    const photoUrl = accountPhotoUrl || userPhotoUrl;
    return {
      ...user,
      ...(profileAccount || {}),
      uid: user.uid,
      email: user.email || profileAccount?.email || "",
      displayName:
        user.displayName ||
        profileAccount?.name ||
        profileAccount?.displayName ||
        user.email?.split("@")[0] ||
        "Customer",
      photoURL: photoUrl,
      photoUrl,
      profilePhotoSource: photoUrl ? "cloudinary" : "",
      profilePhotoUpdatedAt:
        profileAccount?.profilePhotoUpdatedAt ||
        user.profilePhotoUpdatedAt ||
        null
    };
  }, [profileAccount, user]);
  const profilePhotoChangedAt = getProfilePhotoChangedAt(displayUser);

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
    onProfilePhotoUpdatedRef.current = onProfilePhotoUpdated;
  }, [onProfilePhotoUpdated]);

  useEffect(() => {
    if (!user?.uid || bookingsOnly) {
      setProfileAccount(null);
      return undefined;
    }

    return onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        const account = snapshot.exists() ? snapshot.data() : null;
        setProfileAccount(account);
        const imageUrl = getCloudinaryProfilePhotoUrl(account);
        if (imageUrl) onProfilePhotoUpdatedRef.current?.(imageUrl);
      },
      (error) => {
        console.error("Profile account listener failed", error);
      }
    );
  }, [bookingsOnly, user?.uid]);

  const clearProfilePhotoPreview = () => {
    setSelectedProfilePhotoFile(null);
    setProfilePhotoPreviewUrl("");
    if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
  };

  const handleProfilePhotoSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file.");
      return;
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      toast.error("Profile photo should be 300 KB or smaller.");
      return;
    }

    setSelectedProfilePhotoFile(file);
    setProfilePhotoPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return URL.createObjectURL(file);
    });
  };

  const uploadProfilePhoto = async () => {
    if (!selectedProfilePhotoFile || !user?.uid) return;

    setProfilePhotoUploading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please login again before uploading photo.");

      const imageDataUrl = await fileToDataUrl(selectedProfilePhotoFile);
      const response = await fetch(`${API_URL}/api/cloudinary/profile-photo/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ imageDataUrl })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Profile photo upload failed.");
      }

      if (data?.imageUrl) {
        const photoPayload = {
          uid: user.uid,
          email: user.email || "",
          name:
            user.displayName ||
            user.email?.split("@")[0] ||
            "Customer",
          photoURL: data.imageUrl,
          photoUrl: data.imageUrl,
          profilePhotoURL: data.imageUrl,
          profilePhotoPublicId: data.imagePublicId || "",
          profilePhotoSource: "cloudinary",
          profilePhotoUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: data.imageUrl });
        }
        onProfilePhotoUpdated?.(data.imageUrl);
        setProfileAccount((current) => ({
          ...(current || {}),
          ...photoPayload,
          profilePhotoUpdatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        setDoc(doc(db, "users", user.uid), photoPayload, { merge: true }).catch(
          () => {}
        );
        await auth.currentUser?.reload?.();
      }

      toast.success("Profile photo updated.");
      clearProfilePhotoPreview();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Profile photo upload failed."));
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (profilePhotoPreviewUrl) URL.revokeObjectURL(profilePhotoPreviewUrl);
    };
  }, [profilePhotoPreviewUrl]);

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
      limit(12)
    );

    return onSnapshot(
      bookingsRef,
      (snapshot) => {
        const nextBookings = sortUserBookings(
          snapshot.docs.map(normalizeUserBooking)
        ).slice(0, 5);
        setBookings(nextBookings);
        setBookingsLoading(false);
      },
      (error) => {
        console.error("My bookings listener failed", error);
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
        const nextRefunds = snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
            status: String(snapshotDoc.data().status || "").toLowerCase()
          }));
        setRefundRequests(sortRefundRequests(nextRefunds).slice(0, 5));
      },
      (error) => {
        console.error("Refund history listener failed", error);
      }
    );
  }, [user, bookingsOnly]);

  const cancelBooking = async (booking, reason, note) => {
    if (!booking || !editableBookingStatuses.includes(booking.status)) return;

    setCancelBookingId(booking.id);
    try {
      const customerRef = doc(db, "customers", booking.id);
      const existingRefund = refundRequests.find(
        (refund) => refund.bookingId === booking.id
      );
      const shouldAutoRefund =
        booking.paymentProvider === "cashfree" &&
        booking.paymentStatus === "paid" &&
        !existingRefund &&
        !booking.refundRequestId;
      const batch = writeBatch(db);
      const refundRef = shouldAutoRefund ? doc(collection(db, "refundRequests")) : null;
      const refundReason = [reason || "Customer cancelled", note?.trim()]
        .filter(Boolean)
        .join(" - ");
      const customerPatch = {
        status: "cancelled",
        cancelledBy: "customer",
        cancelReason: reason || "Customer cancelled",
        cancelNote: note?.trim() || "",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (refundRef) {
        customerPatch.refundStatus = "requested";
        customerPatch.refundRequestId = refundRef.id;
        customerPatch.refundEligible = true;
        batch.set(refundRef, {
          userId: user.uid,
          bookingId: booking.id,
          bookingGroupId: booking.bookingGroupId || booking.id,
          bookingGroupIndex: booking.bookingGroupIndex || 1,
          bookingGroupSize: booking.bookingGroupSize || 1,
          refundScope: "single_booking",
          partialRefund: true,
          token: booking.token,
          service: booking.service,
          bookingStatus: "cancelled",
          customerName: booking.name || user.displayName || "Customer",
          customerEmail: user.email || "",
          customerMobile: booking.mobile,
          paymentId: booking.paymentId && booking.paymentId !== "-" ? booking.paymentId : "",
          transactionId:
            booking.transactionId && booking.transactionId !== "-"
              ? booking.transactionId
              : "",
          orderId: booking.orderId && booking.orderId !== "-" ? booking.orderId : "",
          amount: Number(booking.refundableAmount || booking.serviceAmount || 0),
          paidAmount: Number(booking.amount || 0),
          cashfreeFee: Number(booking.cashfreeFee || 0),
          platformFee: Number(booking.platformFee || 0),
          nonRefundableFee: Number(
            booking.nonRefundableFee || booking.cashfreeFee + booking.platformFee || 0
          ),
          reason: refundReason,
          refundMethod: "original_payment_method",
          upiId: "",
          bankDetails: null,
          status: "requested",
          expectedWindow: "5-7 business days",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      batch.update(customerRef, customerPatch);
      await batch.commit();
      setPendingCancelBooking(null);

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
        try {
          await setDoc(doc(db, "bookingCounters", booking.bookingDate), counterPatch, {
            merge: true
          });
        } catch (counterError) {
          console.warn("Queue counter update failed after cancellation.", counterError);
        }
      }

      if (
        booking.paymentProvider === "cashfree" &&
        booking.paymentStatus === "paid"
      ) {
        const successMessage = refundRef
          ? "Booking cancelled. Refund request sent automatically."
          : "Booking cancelled. Refund request is already in progress.";
        window.setTimeout(() => toast.success(successMessage), 80);
      } else {
        window.setTimeout(() => toast.success("Booking cancelled."), 80);
      }
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Booking could not be cancelled."));
    } finally {
      setCancelBookingId("");
    }
  };

  const rescheduleCustomerBooking = async (booking, draft, slotLabel) => {
    if (!booking || !editableBookingStatuses.includes(booking.status)) return;

    setRescheduleBookingId(booking.id);
    try {
      const today = toDateInputValue(new Date());
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = toDateInputValue(tomorrowDate);
      const bookingDate = draft.bookingDate || today;
      const selectedTimeSlot = draft.timeSlot || "";
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const allSlots = createTimeSlots(
        bookingGate.openingTime || "07:00",
        bookingGate.closingTime || "23:00"
      );
      const dayKey = bookingDate === today ? "today" : "tomorrow";
      const visibleSlots = getVisibleTimeSlots(dayKey, allSlots);

      if (![today, tomorrow].includes(bookingDate)) {
        toast.error("You can reschedule only for today or tomorrow.");
        return;
      }
      if (booking.bookingDate === today && bookingDate !== today) {
        toast.error("Today booking can only change time slot, not date.");
        return;
      }
      if (
        bookingDate === tomorrow &&
        currentMinutes < ONLINE_BOOKING_START_HOUR * 60
      ) {
        toast.error("Tomorrow reschedule opens after 6:00 AM.");
        return;
      }
      if (!visibleSlots.some((slot) => slot.value === selectedTimeSlot)) {
        toast.error("Selected time slot is not available now.");
        return;
      }

      const previousStatus = String(booking.status || "").toLowerCase();
      const countsTowardQueue = queueCountStatuses.has(previousStatus);
      const dayStats = await getBookingDayStats(bookingDate, allSlots);
      const adjustedSlotCount =
        Number(dayStats.slotCounts[selectedTimeSlot] || 0) -
        (countsTowardQueue &&
        booking.bookingDate === bookingDate &&
        booking.timeSlot === selectedTimeSlot
          ? 1
          : 0);

      if (adjustedSlotCount >= STAFF_COUNT) {
        toast.error("This time slot is full. Please choose another slot.");
        return;
      }

      const customerRef = doc(db, "customers", booking.id);
      await runTransaction(db, async (transaction) => {
        const nextCounterRef = doc(db, "bookingCounters", bookingDate);
        const nextCounterSnapshot = await transaction.get(nextCounterRef);
        const nextCounter = nextCounterSnapshot.exists()
          ? nextCounterSnapshot.data()
          : {};
        const sameCountedSlot =
          countsTowardQueue &&
          booking.bookingDate === bookingDate &&
          booking.timeSlot === selectedTimeSlot;
        const nextCounterSlotCount =
          Number(nextCounter.slotCounts?.[selectedTimeSlot] || 0) -
          (sameCountedSlot ? 1 : 0);

        if (nextCounterSlotCount >= STAFF_COUNT) {
          throw new Error("This time slot is full. Please choose another slot.");
        }

        transaction.update(customerRef, {
          bookingDate,
          bookingDay: bookingDate === today ? "today" : "tomorrow",
          bookingLabel: bookingDate === today ? "Today" : "Tomorrow",
          bookingDisplayDate: getDisplayDate(bookingDate),
          timeSlot: selectedTimeSlot,
          timeSlotLabel: slotLabel,
          rescheduleRequestedBy: "customer",
          rescheduledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        if (
          countsTowardQueue &&
          (booking.bookingDate !== bookingDate ||
            booking.timeSlot !== selectedTimeSlot)
        ) {
          if (booking.bookingDate && booking.timeSlot) {
            transaction.set(
              doc(db, "bookingCounters", booking.bookingDate),
              {
                bookingDate: booking.bookingDate,
                confirmedCount: increment(-1),
                [`slotCounts.${booking.timeSlot}`]: increment(-1),
                updatedAt: serverTimestamp()
              },
              { merge: true }
            );
          }
          transaction.set(
            nextCounterRef,
            {
              bookingDate,
              confirmedCount: increment(1),
              [`slotCounts.${selectedTimeSlot}`]: increment(1),
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
        }
      });

      setRescheduleBooking(null);
      window.setTimeout(() => toast.success("Booking rescheduled."), 80);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Booking could not be rescheduled."));
    } finally {
      setRescheduleBookingId("");
    }
  };

  const shareBookingInvoice = async (booking) => {
    try {
      const bookingRefund = refundRequests.find(
        (refund) => refund.bookingId === booking.id
      );
      const refundInProgress = Boolean(
        bookingRefund || booking.refundStatus || booking.refundRequestId
      );
      const result = await shareBookingInvoiceFile(
        booking,
        user,
        refundInProgress ? bookingRefund || booking : null
      );
      toast.success(
        result.downloaded
          ? "Invoice sharing is not supported here, so PDF downloaded."
          : refundInProgress
            ? "Refund invoice ready to share."
            : "Invoice ready to share."
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        toast.info("Invoice share cancelled.");
        return;
      }
      console.error("Invoice share failed", error);
      toast.error("Invoice share failed. Please try again.");
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
    const pastActiveBooking = isPastActiveBooking(booking);
    const activeBooking = liveBookingStatuses.has(booking.status) && !pastActiveBooking;
    const bookingRefund = refundRequests.find(
      (refund) => refund.bookingId === booking.id
    );
    const refundStatus = String(
      bookingRefund?.status || booking.refundStatus || ""
    ).toLowerCase();
    const refundInProgress =
      refundStatus && !["failed", "rejected"].includes(refundStatus);
    const turnLabel = getEstimatedTurnLabel(booking);
    const helperText =
      pastActiveBooking
        ? "This booking date has passed. Please reschedule to a fresh slot before visiting the salon."
        : refundStatus === "completed"
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
                ? "Online paid booking cancelled. Refund request is created automatically when you cancel. Cashfree charges are non-refundable."
                : booking.status === "cancelled"
                  ? "Booking cancelled."
                  : editableBookingStatuses.includes(booking.status)
                    ? "Your live position is shown below. Estimated turn can update if earlier slots are booked, or if customers cancel/skip."
                    : "Queue status is updating live.";

    return {
      activeBooking,
      bookingRefund,
      pastActiveBooking,
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
            <div className="flex flex-col items-start gap-3">
              <div className="relative">
                {profilePhotoPreviewUrl ? (
                  <span className="relative block h-20 w-20 overflow-hidden rounded-full">
                    <img
                      alt="Profile preview"
                      className="h-20 w-20 rounded-full object-cover"
                      src={profilePhotoPreviewUrl}
                    />
                  </span>
                ) : (
                  <UserAvatar size="h-20 w-20" user={displayUser} />
                )}
                <button
                  aria-label="Choose profile photo"
                  className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border border-[#f9c66d]/40 bg-[#1f160f] text-[#f9c66d] shadow-lg shadow-black/30 transition hover:bg-[#33200f] disabled:opacity-60"
                  disabled={profilePhotoUploading}
                  onClick={() => profilePhotoInputRef.current?.click()}
                  type="button"
                >
                  {profilePhotoUploading ? <ButtonSpinner dark /> : <Camera size={17} />}
                </button>
              </div>
              <input
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(event) => handleProfilePhotoSelect(event.target.files?.[0])}
                ref={profilePhotoInputRef}
                type="file"
              />
              {selectedProfilePhotoFile ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[#f9c66d]/30 bg-[#24170d] px-4 py-2 text-sm font-black text-[#f9c66d] transition hover:bg-[#33200f] disabled:opacity-60"
                    disabled={profilePhotoUploading}
                    onClick={uploadProfilePhoto}
                    type="button"
                  >
                    {profilePhotoUploading ? <ButtonSpinner dark /> : <Upload size={16} />}
                    Upload
                  </button>
                  <button
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[#35201f] bg-[#101a18] px-4 py-2 text-sm font-black text-[#9db2ad] transition hover:border-[#f87171]/40 hover:text-white disabled:opacity-60"
                    disabled={profilePhotoUploading}
                    onClick={clearProfilePhotoPreview}
                    type="button"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                Profile
              </p>
              <h1 className="mt-1 text-3xl font-black leading-tight text-[#f4fbf8] sm:text-4xl">
                {displayUser.displayName || "Customer Profile"}
              </h1>
              <p className="mt-2 break-words text-sm font-bold text-[#637371]">
                {displayUser.email || "Google account connected"}
              </p>
              <p className="mt-2 max-w-xl text-xs font-bold leading-5 text-[#9db2ad]">
                {formatProfilePhotoLock(profilePhotoChangedAt)}
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
              const groupNeedsReschedule = group.items.some(isPastActiveBooking);
              const turns = group.items
                .filter((booking) => booking.status !== "waitlist")
                .map((booking) => Number(booking.token || 0))
                .filter(Boolean);
              const turnLabel = groupNeedsReschedule
                ? "Reschedule needed"
                : turns.length
                ? `Estimated turns #${Math.min(...turns)}${
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
                  liveBookingStatuses.has(booking.status) && !isPastActiveBooking(booking)
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
                      <p className="mt-2 text-xs font-bold leading-5 text-[#f9c66d]">
                        {groupNeedsReschedule
                          ? "This booking date has passed. Please reschedule before visiting."
                          : "Live turn updates with the queue. Earlier slots, skips, or cancellations can change your number."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-[#f4fbf8]">
                        <span className="rounded-full bg-[#101a18] px-3 py-2 text-[#9db2ad]">
                          Live position:{" "}
                          {peopleAhead.length
                            ? Math.min(...peopleAhead) === 0
                              ? "Your turn is near"
                              : `Aapke aage ${Math.min(...peopleAhead)} log`
                            : "-"}
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
                          ETA: {getLiveWaitEstimate(primaryBooking)}
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
              onPageChange={(nextPage) => {
                setBookingPage(nextPage);
                window.requestAnimationFrame(() =>
                  window.scrollTo({ top: 0, behavior: "smooth" })
                );
              }}
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
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                      <div className="min-w-0">
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
                      <div className="grid gap-2 xl:min-w-[360px] xl:justify-items-end">
                        <span className="w-fit rounded-full bg-[#2a1111] px-3 py-1 text-xs font-black text-[#991b1b]">
                          {formatBookingStatus(booking.status)}
                        </span>
                        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
                          <button
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#991b1b] bg-transparent px-3 py-2 text-sm font-black text-[#fca5a5] transition hover:bg-[#991b1b] hover:text-white"
                            onClick={async () => {
                              try {
                                await downloadBookingInvoice(
                                  booking,
                                  user,
                                  refundInProgress ? bookingRefund || booking : null
                                );
                                toast.success(
                                  refundInProgress
                                    ? "Refund invoice downloaded."
                                    : "Invoice downloaded."
                                );
                              } catch (error) {
                                console.error("Invoice download failed", error);
                                toast.error("Invoice download failed. Please try again.");
                              }
                            }}
                            type="button"
                          >
                            <Download size={16} />
                            {refundInProgress ? "Refund Invoice" : "Invoice"}
                          </button>
                          <button
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/35 bg-[#24170d] px-3 py-2 text-sm font-black text-[#f9c66d] transition hover:bg-[#33200f]"
                            onClick={() => shareBookingInvoice(booking)}
                            type="button"
                          >
                            <Share2 size={16} />
                            Share
                          </button>
                          {editableBookingStatuses.includes(booking.status) ? (
                            <>
                              <button
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/35 bg-transparent px-3 py-2 text-sm font-black text-[#f9c66d] transition hover:bg-[#24170d] disabled:opacity-60"
                                disabled={rescheduleBookingId === booking.id}
                                onClick={() => setRescheduleBooking(booking)}
                                type="button"
                              >
                                <CalendarClock size={16} />
                                Reschedule
                              </button>
                              <button
                                className="min-h-11 rounded-2xl border border-[#f87171]/40 bg-[#2a1111] px-3 py-2 text-sm font-black text-[#fca5a5] transition hover:bg-[#3a1515] disabled:opacity-60"
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
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {[
                        [
                          "Estimated Turn",
                          getEstimatedTurnLabel(booking)
                        ],
                        [
                          "Live Position",
                          activeBooking ? getLivePositionText(booking) : "-"
                        ],
                        ["ETA", getLiveWaitEstimate(booking)],
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
                    </div>
                    {activeBooking ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {[
                          [Clock3, "ETA", getLiveWaitEstimate(booking)],
                          [CalendarCheck2, "Live position", getLivePositionText(booking)],
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
        <CancelReasonDialog
          booking={pendingCancelBooking}
          loading={Boolean(cancelBookingId)}
          onClose={() => setPendingCancelBooking(null)}
          onConfirm={cancelBooking}
        />
        <RescheduleDialog
          booking={rescheduleBooking}
          bookingGate={bookingGate}
          loading={Boolean(rescheduleBookingId)}
          onClose={() => setRescheduleBooking(null)}
          onConfirm={rescheduleCustomerBooking}
        />
      </>
      ) : null}
    </section>
  );
}
