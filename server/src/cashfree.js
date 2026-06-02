import crypto from "crypto";
import { config } from "./config.js";

const cashfreeHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-version": config.cashfree.apiVersion,
  "x-client-id": config.cashfree.appId,
  "x-client-secret": config.cashfree.secretKey
});

const CASHFREE_FEE_PERCENT = 1.6;

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

export const calculateCashfreeCustomerCharge = (baseAmount) => {
  const serviceAmount = roundMoney(baseAmount);
  const cashfreeFee = roundMoney((serviceAmount * CASHFREE_FEE_PERCENT) / 100);
  const payableAmount = roundMoney(serviceAmount + cashfreeFee);

  return {
    serviceAmount,
    cashfreeFeePercent: CASHFREE_FEE_PERCENT,
    cashfreeFee,
    payableAmount
  };
};

const cashfreeMode = () =>
  config.cashfree.env === "production" ? "production" : "sandbox";

export const createCashfreeServiceOrder = async ({
  serviceTitle,
  amount,
  customerName,
  customerMobile,
  customerEmail,
  customerUserId,
  bookingDay,
  bookingDate
}) => {
  const charge = calculateCashfreeCustomerCharge(amount);
  const safeCustomerId = String(customerUserId || customerMobile || "guest")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 36);
  const orderId = `svc_${Date.now()}_${safeCustomerId.slice(0, 12)}`;

  const payload = {
    order_id: orderId,
    order_amount: charge.payableAmount,
    order_currency: "INR",
    order_note: `${config.cashfree.businessName} - ${serviceTitle}`.slice(0, 200),
    customer_details: {
      customer_id: safeCustomerId,
      customer_name: customerName || "Salon Customer",
      customer_email: customerEmail,
      customer_phone: customerMobile
    },
    order_meta: {
      return_url: `${config.clientUrl}/payment/status?order_id={order_id}`,
      notify_url: `${config.serverUrl}/api/customer-payments/cashfree/webhook`
    },
    order_tags: {
      businessName: config.cashfree.businessName,
      businessLogoUrl: config.cashfree.businessLogoUrl,
      paymentFor: "service-booking",
      serviceTitle,
      customerUserId: customerUserId || "",
      bookingDay: bookingDay || "",
      bookingDate: bookingDate || "",
      serviceAmount: String(charge.serviceAmount),
      cashfreeFee: String(charge.cashfreeFee)
    }
  };

  const response = await fetch(`${config.cashfree.baseUrl}/orders`, {
    method: "POST",
    headers: cashfreeHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.message || "Cashfree service order creation failed";
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return {
    ...data,
    checkoutMode: cashfreeMode(),
    charge
  };
};

export const getCashfreeOrder = async (orderId) => {
  const response = await fetch(`${config.cashfree.baseUrl}/orders/${orderId}`, {
    method: "GET",
    headers: cashfreeHeaders()
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.message || "Cashfree order lookup failed";
    throw new Error(message);
  }

  return data;
};

export const getCashfreeOrderPayments = async (orderId) => {
  const response = await fetch(
    `${config.cashfree.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
    {
      method: "GET",
      headers: cashfreeHeaders()
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const message = data?.message || "Cashfree payment lookup failed";
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const createCashfreeRefund = async ({
  orderId,
  refundId,
  amount,
  note
}) => {
  if (!orderId) {
    const error = new Error("Cashfree orderId is required for refund.");
    error.statusCode = 400;
    throw error;
  }

  if (!refundId) {
    const error = new Error("A unique refundId is required.");
    error.statusCode = 400;
    throw error;
  }

  const refundAmount = roundMoney(amount);
  if (refundAmount <= 0) {
    const error = new Error("Refund amount must be greater than zero.");
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch(
    `${config.cashfree.baseUrl}/orders/${encodeURIComponent(orderId)}/refunds`,
    {
      method: "POST",
      headers: cashfreeHeaders(),
      body: JSON.stringify({
        refund_amount: refundAmount,
        refund_id: refundId,
        refund_note: note || "Customer booking refund"
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const message = data?.message || "Cashfree refund creation failed";
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

export const getCashfreeRefund = async ({ orderId, refundId }) => {
  const response = await fetch(
    `${config.cashfree.baseUrl}/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refundId)}`,
    {
      method: "GET",
      headers: cashfreeHeaders()
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const message = data?.message || "Cashfree refund lookup failed";
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

export const getCashfreeOrderRefunds = async (orderId) => {
  const response = await fetch(
    `${config.cashfree.baseUrl}/orders/${encodeURIComponent(orderId)}/refunds`,
    {
      method: "GET",
      headers: cashfreeHeaders()
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const message = data?.message || "Cashfree refunds lookup failed";
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const verifyCashfreeWebhook = ({ signature, timestamp, rawBody }) => {
  if (!signature || !timestamp || !rawBody) return false;

  const signedPayload = `${timestamp}${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", config.cashfree.secretKey)
    .update(signedPayload)
    .digest("base64");

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  return (
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected)
  );
};
