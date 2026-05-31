import { getDb } from "./firebaseAdmin.js";

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
