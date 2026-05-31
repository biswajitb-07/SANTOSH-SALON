import express from "express";
import {
  createRazorpaySubscriptionOrder,
  subscriptionPlan,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature
} from "../razorpay.js";
import { saveRazorpaySubscription } from "../paymentStatus.js";
import { requireAdminUser } from "../middleware/security.js";
import { cleanString, requireFields } from "../middleware/validation.js";

export const subscriptionsRouter = express.Router();

subscriptionsRouter.get("/plans", (_req, res) => {
  res.json({ plans: [subscriptionPlan] });
});

subscriptionsRouter.post("/razorpay/create-order", requireAdminUser, async (req, res, next) => {
  try {
    const { salonId, ownerId } = req.body;

    const missing = requireFields(req.body, ["salonId", "ownerId"]);
    if (missing) {
      return res.status(400).json({ error: missing });
    }

    const order = await createRazorpaySubscriptionOrder({
      salonId: cleanString(salonId, 120),
      ownerId: cleanString(ownerId, 120)
    });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/razorpay/verify", requireAdminUser, async (req, res, next) => {
  try {
    const {
      salonId,
      ownerId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature
    } = req.body;

    const missing = requireFields(req.body, [
      "salonId",
      "ownerId",
      "razorpay_order_id",
      "razorpay_payment_id",
      "razorpay_signature"
    ]);
    if (missing) {
      return res.status(400).json({ error: missing });
    }

    const verified = verifyRazorpayCheckoutSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    if (!verified) {
      return res.status(401).json({ error: "Invalid Razorpay signature" });
    }

    const firestore = await saveRazorpaySubscription({
      salonId: cleanString(salonId, 120),
      ownerId: cleanString(ownerId, 120),
      orderId: cleanString(razorpayOrderId, 120),
      paymentId: cleanString(razorpayPaymentId, 120),
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
