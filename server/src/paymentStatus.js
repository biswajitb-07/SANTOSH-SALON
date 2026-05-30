import { getDb } from "./firebaseAdmin.js";

const planFromAmount = (amount) => {
  if (Number(amount) === 499) return "pro";
  if (Number(amount) === 199) return "basic";
  return "free";
};

export const saveSuccessfulPayment = async ({ order, payment, source }) => {
  const db = getDb();
  if (!db) {
    return { saved: false, reason: "Firebase Admin is not configured" };
  }

  const orderTags = order?.order_tags || payment?.order_tags || {};
  const salonId = orderTags.salonId || payment?.customer_details?.customer_id;
  if (!salonId) {
    return { saved: false, reason: "salonId not found in payment payload" };
  }

  const amount = order?.order_amount || payment?.order_amount;
  const plan = orderTags.plan || planFromAmount(amount);

  await db.collection("salons").doc(salonId).set(
    {
      plan,
      paymentStatus: "active",
      premiumEnabled: plan !== "free",
      cashfree: {
        source,
        orderId: order?.order_id || payment?.order_id,
        paymentId: payment?.cf_payment_id || payment?.payment_id || null,
        orderStatus: order?.order_status || null,
        paymentStatus: payment?.payment_status || null,
        amount,
        updatedAt: new Date().toISOString()
      }
    },
    { merge: true }
  );

  return { saved: true };
};

export const saveRazorpaySubscription = async ({
  salonId,
  ownerId,
  orderId,
  paymentId,
  source,
  eventId
}) => {
  const db = getDb();
  if (!db) {
    return { saved: false, reason: "Firebase Admin is not configured" };
  }

  if (!salonId) {
    return { saved: false, reason: "salonId not found in subscription payload" };
  }

  const now = new Date();
  const premiumUntil = new Date(now);
  premiumUntil.setMonth(premiumUntil.getMonth() + 1);

  await db.collection("salons").doc(salonId).set(
    {
      plan: "premium",
      paymentStatus: "active",
      premiumEnabled: true,
      premiumUntil: premiumUntil.toISOString(),
      razorpay: {
        source,
        eventId: eventId || null,
        orderId: orderId || null,
        paymentId: paymentId || null,
        ownerId: ownerId || null,
        amount: 699,
        currency: "INR",
        updatedAt: now.toISOString()
      }
    },
    { merge: true }
  );

  if (eventId) {
    await db.collection("paymentEvents").doc(eventId).set(
      {
        provider: "razorpay",
        salonId,
        orderId: orderId || null,
        paymentId: paymentId || null,
        processedAt: now.toISOString()
      },
      { merge: true }
    );
  }

  return { saved: true };
};
