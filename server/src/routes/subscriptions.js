import express from "express";
import {
  createRazorpaySubscriptionOrder,
  subscriptionPlan,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature
} from "../razorpay.js";
import { saveRazorpaySubscription } from "../paymentStatus.js";

export const subscriptionsRouter = express.Router();

subscriptionsRouter.get("/plans", (_req, res) => {
  res.json({ plans: [subscriptionPlan] });
});

subscriptionsRouter.post("/razorpay/create-order", async (req, res, next) => {
  try {
    const { salonId, ownerId } = req.body;

    if (!salonId || !ownerId) {
      return res.status(400).json({ error: "salonId and ownerId are required" });
    }

    const order = await createRazorpaySubscriptionOrder({ salonId, ownerId });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/razorpay/verify", async (req, res, next) => {
  try {
    const {
      salonId,
      ownerId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature
    } = req.body;

    const verified = verifyRazorpayCheckoutSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    if (!verified) {
      return res.status(401).json({ error: "Invalid Razorpay signature" });
    }

    const firestore = await saveRazorpaySubscription({
      salonId,
      ownerId,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      source: "razorpay-checkout-verify"
    });

    res.json({ verified: true, firestore });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/razorpay/webhook", async (req, res, next) => {
  try {
    const valid = verifyRazorpayWebhookSignature({
      signature: req.header("x-razorpay-signature"),
      rawBody: req.rawBody
    });

    if (!valid) {
      return res.status(401).json({ error: "Invalid Razorpay webhook signature" });
    }

    const event = req.body;
    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;
    const notes = paymentEntity?.notes || orderEntity?.notes || {};
    const isPaid =
      event?.event === "order.paid" || paymentEntity?.status === "captured";

    let firestore = { saved: false, reason: "Webhook event is not paid" };
    if (isPaid) {
      firestore = await saveRazorpaySubscription({
        salonId: notes.salonId,
        ownerId: notes.ownerId,
        orderId: paymentEntity?.order_id || orderEntity?.id,
        paymentId: paymentEntity?.id,
        eventId: req.header("x-razorpay-event-id"),
        source: "razorpay-webhook"
      });
    }

    res.json({ ok: true, firestore });
  } catch (error) {
    next(error);
  }
});
