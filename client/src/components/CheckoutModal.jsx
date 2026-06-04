import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import {
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  Phone,
  Tag,
  X
} from "lucide-react";
import { db } from "../lib/firebase.js";
import {
  useCreateCustomerPaymentOrderMutation,
  useReindexBookingDateMutation,
  useVerifyCustomerPaymentMutation
} from "../store/api/customerPaymentsApi.js";
import {
  ButtonSpinner,
  ConfirmDialog,
  getUserPhotoUrl,
  useBodyScrollLock,
  useDragScroll
} from "./common.jsx";
import { MobileErrorCard } from "./ClientErrorStates.jsx";
import { formatMoney } from "../lib/formatters.js";
import { defaultServices } from "../lib/services.js";
import {
  BARBER_OPTIONS,
  confirmedBookingStatuses,
  DAILY_BOOKING_LIMIT,
  createTimeSlots,
  DAILY_CONFIRMED_LIMIT,
  DEFAULT_COUPONS,
  getActiveUserBookings,
  getBookingDayStats,
  getBookingOption,
  getBookingSortMinutes,
  getBookingWindowMessage,
  getCashfreeChargePreview,
  getCouponDiscount,
  getRequestErrorMessage,
  getVisibleTimeSlots,
  isCustomerBookingWindowOpen,
  loadCashfreeCheckout,
  normalizeBarberAvailability,
  PLATFORM_FEE_PER_PERSON,
  pruneUserBookingHistory,
  STAFF_COUNT,
  timeSlots,
  WAITLIST_LIMIT
} from "../lib/bookingFlow.js";

function DottedBookingLoader() {
  const dots = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * Math.PI * 2) / 12;
    const radius = 24;
    return {
      cx: 32 + Math.sin(angle) * radius,
      cy: 32 - Math.cos(angle) * radius,
      opacity: 0.24 + index * 0.058
    };
  });

  return (
    <div
      aria-label="Processing booking"
      className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#f9c66d]/20 bg-[#24170d]/60"
      role="status"
    >
      <svg
        aria-hidden="true"
        className="h-16 w-16 animate-spin"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        viewBox="0 0 64 64"
      >
        {dots.map((dot, index) => (
          <circle
            cx={dot.cx}
            cy={dot.cy}
            fill="#f9c66d"
            key={index}
            opacity={dot.opacity}
            r="4.2"
          />
        ))}
      </svg>
    </div>
  );
}

export function CheckoutModal({
  bookingGate,
  service,
  user,
  userAccount,
  onBookingSuccess,
  onClose
}) {
  const [createCustomerPaymentOrder] = useCreateCustomerPaymentOrderMutation();
  const [reindexBookingDate] = useReindexBookingDateMutation();
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
  const [processingLabel, setProcessingLabel] = useState("Opening Cashfree...");
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
  const slotDragScroll = useDragScroll();
  const [slotState, setSlotState] = useState({
    loading: true,
    availableSlots: [],
    displaySlots: [],
    confirmedCount: 0,
    waitlistCount: 0
  });
  const bookingTimeSlots = useMemo(
    () => createTimeSlots(bookingGate.openingTime, bookingGate.closingTime),
    [bookingGate.closingTime, bookingGate.openingTime]
  );
  const availableBarbers = useMemo(
    () =>
      (bookingGate.barbers || normalizeBarberAvailability())
        .filter((barber) => barber.available)
        .map((barber) => barber.name),
    [bookingGate.barbers]
  );
  const barberChoices = useMemo(
    () => [BARBER_OPTIONS[0], ...availableBarbers],
    [availableBarbers]
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
        const visibleSlots = getVisibleTimeSlots(form.bookingDay, bookingTimeSlots).map(
          (slot) => {
            const bookedCount = Number(stats.slotCounts[slot.value] || 0);
            const remainingSeats = Math.max(0, STAFF_COUNT - bookedCount);
            return {
              ...slot,
              bookedCount,
              remainingSeats,
              full: remainingSeats < requiredSeats
            };
          }
        );
        const availableSlots = visibleSlots.filter((slot) => !slot.full);
        setSlotState({
          loading: false,
          availableSlots,
          displaySlots: visibleSlots,
          confirmedCount: stats.confirmedCount,
          waitlistCount: stats.waitlistCount
        });
        setForm((current) => {
          const currentSlotAvailable = availableSlots.some(
            (slot) => slot.value === current.timeSlot
          );

          if (current.timeSlot && currentSlotAvailable) return current;

          return {
            ...current,
            timeSlot: availableSlots[0]?.value || ""
          };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSlotState({
          loading: false,
          availableSlots: [],
          displaySlots: [],
          confirmedCount: 0,
          waitlistCount: 0
        });
      });

    return () => {
      cancelled = true;
    };
  }, [bookingTimeSlots, form.bookingDay, form.includeGuest, service]);

  useEffect(() => {
    if (!service || form.preferredBarber === BARBER_OPTIONS[0]) return;
    if (!availableBarbers.includes(form.preferredBarber)) {
      setForm((value) => ({ ...value, preferredBarber: BARBER_OPTIONS[0] }));
    }
  }, [availableBarbers, form.preferredBarber, service]);

  const activeService = service || defaultServices[0];
  const guestMobile = form.guestMobile.replace(/\D/g, "");
  const peopleCount = form.includeGuest ? 2 : 1;
  const bookingOptionForBarber = getBookingOption(form.bookingDay);
  const salonCoupons = bookingGate.coupons || DEFAULT_COUPONS;
  const couponCode = appliedCouponCode;
  const typedCouponCode = form.couponCode.trim().toUpperCase();
  const discountAmount = getCouponDiscount(
    appliedCouponCode,
    activeService.amount,
    peopleCount,
    salonCoupons
  );
  const platformFeeTotal = PLATFORM_FEE_PER_PERSON * peopleCount;
  const discountedServiceAmount = Math.max(
    0,
    Math.round((Number(activeService.amount || 0) * peopleCount - discountAmount) * 100) / 100
  );
  const perPersonServiceAmount =
    Math.round((discountedServiceAmount / peopleCount) * 100) / 100;
  const onlineChargePreview = useMemo(
    () =>
      getCashfreeChargePreview(
        perPersonServiceAmount + PLATFORM_FEE_PER_PERSON,
        peopleCount
      ),
    [peopleCount, perPersonServiceAmount]
  );
  const chargePreview = onlineChargePreview;

  const selectedBarberAvailable =
    form.preferredBarber === BARBER_OPTIONS[0] ||
    availableBarbers.includes(form.preferredBarber);

  if (!service) return null;

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

    if (
      !selectedSlot &&
      slotState.confirmedCount + slotState.waitlistCount < DAILY_BOOKING_LIMIT
    ) {
      const message =
        "Online slots are complete for this time window. Go to salon for walk-in help.";
      setStatus({
        type: "error",
        message
      });
      toast.error(message);
      return;
    }

    setLoading(true);
    setShowProcessingOverlay(false);
    setProcessingLabel("Checking booking details...");
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
      const paymentToastId = "cashfree-checkout-progress";
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
      const prePaymentTotalBookings =
        prePaymentStats.confirmedCount + prePaymentStats.waitlistCount;
      if (prePaymentTotalBookings + customers.length > DAILY_BOOKING_LIMIT) {
        const message =
          "Daily booking limit reached. Only 100 bookings are allowed per day.";
        setStatus({
          type: "error",
          message
        });
        toast.error(message);
        setLoading(false);
        return;
      }
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
          "The waiting list already has 50 customers. Booking will reopen when the waiting list drops below 50.";
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
      const checkoutRequestId =
        window.crypto?.randomUUID?.() ||
        `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

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
        bookingDate: bookingOption.date,
        peopleCount: customers.length,
        timeSlot: selectedSlot?.value || "",
        checkoutRequestId
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
      setProcessingLabel("Opening Cashfree checkout...");
      toast.info(
        `Opening secure Cashfree checkout for ${formatMoney(
          order.charge?.payableAmount
        )}.`,
        { id: paymentToastId, duration: 2400 }
      );

      const cashfree = window.Cashfree({
        mode: order.checkoutMode || "sandbox"
      });

      const result = await cashfree.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_modal"
      });

      if (result?.error) {
        toast.info("Payment pending/cancelled. Complete checkout only when you are ready.", {
          id: paymentToastId,
          duration: 3200
        });
        throw new Error(
          result.error?.message ||
            result.error?.paymentMessage ||
            "Cashfree payment failed"
        );
      }

      setShowProcessingOverlay(true);
      setProcessingLabel("Payment received. Verifying payment...");
      const verification = await verifyCustomerPayment(order.order_id).unwrap();
      if (!verification.verified) {
        throw new Error(verification.error || "Payment verification failed");
      }
      setProcessingLabel("Payment verified. Creating your booking...");

      paidOrder = verification.order || {};
      paidPayment = verification.payment || {};
      charge = order.charge || onlineChargePreview;

      setProcessingLabel("Checking latest queue availability...");
      const dayStats = await getBookingDayStats(bookingOption.date, bookingTimeSlots);
      const bookingGroupId = `grp_${Date.now()}_${user.uid.slice(0, 8)}`;
      let bookingRefs = [];
      let bookedTurns = [];
      let bookingCreatedAsWaitlist = false;
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
        if (confirmedCount + waitlistCount + customers.length > DAILY_BOOKING_LIMIT) {
          throw new Error(
            "Daily booking limit reached. Only 100 bookings are allowed per day."
          );
        }
        const isWaitlist =
          confirmedCount + customers.length > DAILY_CONFIRMED_LIMIT ||
          slotOverCapacity;
        bookingCreatedAsWaitlist = isWaitlist;

        if (isWaitlist && waitlistCount + customers.length > WAITLIST_LIMIT) {
          throw new Error(
            "The waiting list already has 50 customers. Booking will reopen when the waiting list drops below 50."
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
            checkoutRequestId,
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

      try {
        setProcessingLabel("Finalizing your queue turn...");
        const reindexResult = await reindexBookingDate({
          bookingDate: bookingOption.date,
          bookingGroupId
        }).unwrap();
        const createdBookingIds = new Set(bookingRefs.map((bookingRef) => bookingRef.id));
        const reindexedTurns = (reindexResult.bookings || [])
          .filter((booking) => createdBookingIds.has(booking.id))
          .map((booking) => Number(booking.token || 0))
          .filter((token) => token > 0)
          .sort((first, second) => first - second);

        if (reindexedTurns.length) {
          bookedTurns = reindexedTurns;
          bookingCreatedAsWaitlist = false;
        } else if ((reindexResult.waitlistBookings || []).some((booking) => createdBookingIds.has(booking.id))) {
          bookedTurns = [];
          bookingCreatedAsWaitlist = true;
        }
      } catch {
        setStatus({
          type: "info",
          message: "Booking saved. Estimated turn will refresh shortly."
        });
      }

      const firstTurn = bookedTurns[0] || "-";
      const lastTurn = bookedTurns[bookedTurns.length - 1] || firstTurn;
      const estimatedTurnText = bookedTurns.length
        ? `Estimated turn #${firstTurn}${bookedTurns.length > 1 ? `-${lastTurn}` : ""}`
        : "Waiting list";
      const userPhotoURL = getUserPhotoUrl(user);

      setProcessingLabel("Saving booking history...");
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: form.name.trim(),
          email: user.email || "",
          mobile,
          phone: mobile,
          ...(userPhotoURL ? { photoURL: userPhotoURL } : {}),
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
        setStatus({
          type: "info",
          message: "Booking saved. Old history cleanup will retry on your next booking."
        });
      }

      toast.dismiss(paymentToastId);
      setProcessingLabel("Opening My Bookings...");
      setStatus({
        type: "success",
        message: `Cashfree payment verified. ${estimatedTurnText} ${
          bookingCreatedAsWaitlist ? "added to the waiting list" : "confirmed"
        } for ${bookingOption.label}, ${bookingOption.displayDate}. Track My Bookings for live position and people ahead. Turn can update when earlier slots, skips, or cancellations happen.`
      });
      const successToastMessage = `Booking ${
        bookingCreatedAsWaitlist ? "added to waiting list" : "confirmed"
      }. ${estimatedTurnText} for ${bookingOption.label}.`;
      setLoading(false);
      onBookingSuccess?.({
        bookingId: bookingRefs[0]?.id,
        serviceTitle: service.title,
        slotText: `${selectedSlot?.label || selectedSlot?.value || ""} ${bookingOption.label}`.trim(),
        turnText: bookedTurns.length
          ? `#${firstTurn}${bookedTurns.length > 1 ? `-${lastTurn}` : ""}`
          : "Waiting list",
        toastMessage: successToastMessage
      });
    } catch (error) {
      toast.dismiss("cashfree-checkout-progress");
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
      setProcessingLabel("Opening Cashfree...");
      setShowProcessingOverlay(false);
      setLoading(false);
    }
  };

  return (
    <div className="checkout-mobile-modal modal-fade fixed inset-0 z-[9999] flex h-[100dvh] items-center justify-center overflow-hidden bg-black/75 px-3 py-4 sm:px-5 sm:py-6">
      <section className="checkout-mobile-panel relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#f9c66d]/15 bg-[#081311]/95 text-[#f4fbf8] shadow-2xl shadow-black/45 sm:max-h-[min(820px,calc(100dvh-3rem))] sm:max-w-3xl sm:rounded-[2rem] lg:max-w-4xl">
        <div className="checkout-mobile-header sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#35201f] bg-[#081311]/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="section-kicker">
              Santosh Salon Queue
            </p>
            <h2 className="mt-1 text-3xl font-black">Checkout</h2>
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

        <form className="checkout-mobile-form min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 sm:p-6" onSubmit={submitCheckout}>
          <div className="checkout-stepper" aria-label="Checkout progress">
            {[
              [Check, "Service", true],
              [Check, "Details", true],
              [Check, "Barber", true],
              [Clock3, "Slot", true],
              [CreditCard, "Pay", false]
            ].map(([Icon, label, active], index) => (
              <div
                className={`checkout-step ${active ? "checkout-step-active" : ""}`}
                key={label}
              >
                {index > 0 ? <span className="checkout-step-line" /> : null}
                <span className="checkout-step-dot">
                  <Icon size={14} />
                </span>
                <span className="checkout-step-label">{label}</span>
              </div>
            ))}
          </div>

          <div className="checkout-selected-card">
            <p className="checkout-section-label">Selected Service</p>
            <div className="checkout-selected-content">
              <img
                alt={service.title}
                className="checkout-selected-image"
                decoding="async"
                loading="lazy"
                src={service.imageUrl || "/assets/service-haircut.jpg"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-[#f4fbf8]">
                  {service.title}
                  {peopleCount > 1 ? ` x ${peopleCount}` : ""}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#9db2ad]">
                  <Clock3 size={14} />
                  {service.time || "25 min"}
                </p>
              </div>
              <p className="text-xl font-black text-[#f9c66d]">
                {formatMoney(discountedServiceAmount)}
              </p>
            </div>
          </div>

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
                  One checkout can create up to 2 estimated turns: you and one guest.
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
            <span className="checkout-section-label mb-2 block">Select Time Slot</span>
            <div
              className="checkout-slot-grid services-slider drag-scroll -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3"
              {...slotDragScroll}
            >
              {slotState.loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    className="h-24 min-w-[72%] animate-pulse snap-start rounded-2xl bg-[#f6faf8] sm:min-w-[42%] lg:min-w-[34%]"
                    key={index}
                  />
                ))
              ) : slotState.displaySlots.length ? (
                slotState.displaySlots.map((slot) => {
                  const active = form.timeSlot === slot.value;
                  const disabled = slot.full;
                  const availabilityText =
                    slot.remainingSeats > 0
                      ? `${slot.remainingSeats} slot${
                          slot.remainingSeats > 1 ? "s" : ""
                        } available`
                      : "Slot complete";

                  return (
                    <button
                    className={`checkout-slot-button min-h-20 min-w-[80px] snap-start rounded-2xl border px-4 py-3 text-center transition disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[42%] lg:min-w-[34%] ${
                        active
                          ? "border-[#f87171] bg-[#3a1515] text-[#f4fbf8] ring-4 ring-[#ef4444]/20"
                          : disabled
                            ? "border-[#f9c66d]/25 bg-[#24170d] text-[#f9c66d]"
                          : "border-[#4a2525] bg-[#0b1714] text-[#9db2ad] hover:border-[#f87171]"
                      }`}
                      disabled={disabled}
                      key={slot.value}
                      onClick={() =>
                        setForm((value) => ({ ...value, timeSlot: slot.value }))
                      }
                      type="button"
                    >
                      <span className="block font-black">{slot.label}</span>
                      <span className="mt-1 block text-xs font-bold">
                        {availabilityText}
                      </span>
                      {disabled ? (
                        <span className="mt-1 block text-xs font-black text-[#fca5a5]">
                          Go to salon
                        </span>
                      ) : (
                        <span className="mt-1 block text-[11px] font-bold text-[#71908a]">
                          {slot.bookedCount}/{STAFF_COUNT} booked
                        </span>
                      )}
                    </button>
                  );
                })
              ) : slotState.confirmedCount + slotState.waitlistCount >= DAILY_BOOKING_LIMIT ? (
                <MobileErrorCard
                  actions={
                    <button className="mobile-error-primary" onClick={onClose} type="button">
                      Select New Slot
                    </button>
                  }
                  icon="slot"
                  title="Slot No Longer Available"
                >
                  Today&apos;s online booking slots are complete. Go to salon for walk-in help.
                </MobileErrorCard>
              ) : (
                <MobileErrorCard
                  actions={
                    <button className="mobile-error-primary" onClick={onClose} type="button">
                      Select New Slot
                    </button>
                  }
                  icon="slot"
                  title="Slot No Longer Available"
                >
                  No future slots are available for today. Go to salon for walk-in help.
                </MobileErrorCard>
              )}
            </div>
            {slotState.displaySlots.length && !slotState.availableSlots.length ? (
              <div className="mt-2">
                <MobileErrorCard
                  actions={
                    <button className="mobile-error-primary" onClick={onClose} type="button">
                      Select New Slot
                    </button>
                  }
                  icon="slot"
                  title="Slot No Longer Available"
                >
                  Online slots are complete for this time window. Go to salon for walk-in help.
                </MobileErrorCard>
              </div>
            ) : null}
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
          <div className="flex items-center gap-3 rounded-2xl border border-[#35201f] bg-[#101a18] p-3">
            <img
              alt="Santosh Salon Queue"
              className="h-12 w-12 rounded-2xl border border-[#f9c66d]/25 object-cover"
              decoding="async"
              loading="lazy"
              src="/assets/owner-santosh-avatar.png"
            />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f9c66d]">
                Pay securely to
              </p>
              <p className="truncate text-lg font-black text-[#f4fbf8]">
                Santosh Salon Queue
              </p>
            </div>
          </div>
          <div className="checkout-price-card rounded-2xl border border-[#35201f] bg-[#0b1714] p-4">
            <p className="checkout-section-label text-sm font-bold text-[#9db2ad]">Price Breakdown</p>
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
              <div className="checkout-total-row flex items-center justify-between gap-3 border-t border-[#35201f] pt-2 text-base text-[#f4fbf8]">
                <span>Total payable</span>
                <span>{formatMoney(chargePreview.payableAmount)}</span>
              </div>
            </div>
          </div>
          <p className="rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] px-4 py-3 text-sm font-bold leading-6 text-[#f9c66d]">
            Cancellation is available before service starts. Refunds are for the eligible service amount only; platform fee and Cashfree charges are non-refundable.
          </p>
          <button
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 py-4 font-black text-white shadow-lg shadow-[#991b1b]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <>
                <ButtonSpinner />
                {processingLabel}
              </>
            ) : (
              <>
                Continue to Payment{" "}
                <ArrowRight size={19} />
              </>
            )}
          </button>
        </form>

        {status?.type === "error" ? (
          <div className="p-5 pt-0 sm:p-6 sm:pt-0">
            <MobileErrorCard
              actions={
                <div className="grid gap-2">
                  <button
                    className="mobile-error-primary"
                    onClick={() => setStatus(null)}
                    type="button"
                  >
                    Retry Payment
                  </button>
                </div>
              }
              details={[
                ["Amount", formatMoney(chargePreview.payableAmount)],
                ["Service", service.title]
              ]}
              icon="failed"
              title={
                status.message.toLowerCase().includes("payment")
                  ? "Payment Failed"
                  : "Booking Error"
              }
              tone="red"
            >
              {status.message}
            </MobileErrorCard>
          </div>
        ) : status ? (
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
        {loading && showProcessingOverlay ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-[#06100e]/90 px-5 text-center">
            <div className="w-full max-w-sm rounded-3xl border border-[#f9c66d]/20 bg-[#081311] p-6 shadow-2xl shadow-black/40">
              <DottedBookingLoader />
              <h3 className="mt-4 text-xl font-black text-[#f4fbf8]">
                Processing your booking
              </h3>
              <p className="mt-2 text-sm font-bold leading-6 text-[#f9c66d]">
                {processingLabel}
              </p>
              <p className="mt-3 text-xs font-bold leading-5 text-[#9db2ad]">
                Please wait. My Bookings will open automatically after confirmation.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

