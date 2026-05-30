import express from "express";
import {
  createCashfreeOrder,
  getCashfreeOrder,
  verifyCashfreeWebhook
} from "../cashfree.js";
import { saveSuccessfulPayment } from "../paymentStatus.js";

export const paymentsRouter = express.Router();

const plans = {
  basic: 199,
  pro: 499
};

paymentsRouter.post("/create-order", async (req, res, next) => {
  try {
    const { plan, salonId, ownerId, customer } = req.body;

    if (!plans[plan]) {
      return res.status(400).json({ error: "Invalid paid plan" });
    }

    if (!salonId || !ownerId) {
      return res.status(400).json({ error: "salonId and ownerId are required" });
    }

    const order = await createCashfreeOrder({
      amount: plans[plan],
      plan,
      salonId,
      ownerId,
      customer
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

paymentsRouter.get("/verify/:orderId", async (req, res, next) => {
  try {
    const order = await getCashfreeOrder(req.params.orderId);

    let firestore = { saved: false, reason: "Order is not paid" };
    if (order.order_status === "PAID") {
      firestore = await saveSuccessfulPayment({
        order,
        source: "verify-api"
      });
    }

    res.json({ order, firestore });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/webhook/cashfree", async (req, res, next) => {
  try {
    const isValid = verifyCashfreeWebhook({
      signature: req.header("x-webhook-signature"),
      timestamp: req.header("x-webhook-timestamp"),
      rawBody: req.rawBody
    });

    if (!isValid) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;
    const payment = event?.data?.payment || event?.data;
    const order = event?.data?.order || payment;
    const status = payment?.payment_status || order?.order_status;

    let firestore = { saved: false, reason: "Webhook was not a success event" };
    if (status === "SUCCESS" || status === "PAID") {
      firestore = await saveSuccessfulPayment({
        order,
        payment,
        source: "cashfree-webhook"
      });
    }

    res.json({ ok: true, firestore });
  } catch (error) {
    next(error);
  }
});
