import crypto from "node:crypto";
import Razorpay from "razorpay";
import { config } from "./config.js";

const getRazorpay = () => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
  }

  if (config.razorpay.keySecret.includes("RAZORPAY_")) {
    throw new Error(
      "Invalid RAZORPAY_KEY_SECRET. Check server/.env and put RAZORPAY_WEBHOOK_SECRET on a new line."
    );
  }

  return new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret
  });
};

const getRazorpayError = (error, fallback) => {
  const message =
    error?.error?.description ||
    error?.response?.data?.error?.description ||
    error?.message ||
    fallback;
  const nextError = new Error(message);
  nextError.statusCode = error?.statusCode || error?.status || 502;
  nextError.details = error?.error || error?.response?.data || null;
  return nextError;
};

export const subscriptionPlan = {
  id: "premium",
  name: "Premium",
  amount: 699,
  amountPaise: 69900,
  currency: "INR",
  interval: "month",
  features: [
    "Premium dashboard insights",
    "Queue analytics",
    "Public queue branding",
    "Payment-ready salon profile"
  ]
};

export const createRazorpaySubscriptionOrder = async ({ salonId, ownerId }) => {
  const razorpay = getRazorpay();
  const receipt = `premium_${salonId}_${Date.now()}`.slice(0, 40);

  const order = await razorpay.orders
    .create({
      amount: subscriptionPlan.amountPaise,
      currency: subscriptionPlan.currency,
      receipt,
      notes: {
        type: "salon_subscription",
        plan: subscriptionPlan.id,
        salonId,
        ownerId
      }
    })
    .catch((error) => {
      throw getRazorpayError(error, "Unable to create Razorpay subscription order");
    });

  return {
    ...order,
    key_id: config.razorpay.keyId,
    plan: subscriptionPlan
  };
};

export const createRazorpayServiceOrder = async ({
  serviceTitle,
  amount,
  customerName,
  customerMobile,
  customerUserId
}) => {
  const razorpay = getRazorpay();
  const receipt = `service_${Date.now()}`.slice(0, 40);

  const order = await razorpay.orders
    .create({
      amount: Number(amount) * 100,
      currency: "INR",
      receipt,
      notes: {
        type: "customer_service",
        serviceTitle,
        customerName,
        customerMobile,
        customerUserId
      }
    })
    .catch((error) => {
      throw getRazorpayError(error, "Unable to create Razorpay service order");
    });

  return {
    ...order,
    key_id: config.razorpay.keyId
  };
};

export const verifyRazorpayCheckoutSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
}) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", config.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const providedBuffer = Buffer.from(razorpaySignature);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

export const verifyRazorpayWebhookSignature = ({ signature, rawBody }) => {
  if (!config.razorpay.webhookSecret) {
    throw new Error("Missing RAZORPAY_WEBHOOK_SECRET");
  }

  if (!signature || !rawBody) return false;

  const expected = crypto
    .createHmac("sha256", config.razorpay.webhookSecret)
    .update(rawBody)
    .digest("hex");

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
};
