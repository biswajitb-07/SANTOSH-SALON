import express from "express";
import {
  createCashfreeRefund,
  createCashfreeServiceOrder,
  getCashfreeOrder,
  getCashfreeOrderPayments,
  getCashfreeOrderRefunds,
  getCashfreeRefund,
  verifyCashfreeWebhook
} from "../cashfree.js";
import { getDb } from "../firebaseAdmin.js";
import {
  createRateLimiter,
  requireAdminUser
} from "../middleware/security.js";
import {
  cleanEmail,
  cleanPhone,
  cleanString,
  parsePositiveAmount,
  requireFields
} from "../middleware/validation.js";
import { logWebhookEvent } from "../webhookLogs.js";

export const customerPaymentsRouter = express.Router();
const writeLimiter = createRateLimiter({
  keyPrefix: "customer-payments-write",
  max: 20,
  windowMs: 60_000
});

customerPaymentsRouter.post("/cashfree/create-order", writeLimiter, async (req, res, next) => {
  try {
    const {
      serviceTitle,
      amount,
      customerName,
      customerMobile,
      customerEmail,
      customerUserId,
      bookingDay,
      bookingDate
    } = req.body;

    const missing = requireFields(req.body, [
      "serviceTitle",
      "amount",
      "customerName",
      "customerMobile"
    ]);
    const safeAmount = parsePositiveAmount(amount);
    if (missing || !safeAmount) {
      return res.status(400).json({
        error: missing || "A valid amount is required"
      });
    }

    const order = await createCashfreeServiceOrder({
      serviceTitle: cleanString(serviceTitle, 80),
      amount: safeAmount,
      customerName: cleanString(customerName, 80),
      customerMobile: cleanPhone(customerMobile),
      customerEmail: cleanEmail(customerEmail),
      customerUserId: cleanString(customerUserId, 80),
      bookingDay: cleanString(bookingDay, 20),
      bookingDate: cleanString(bookingDate, 20)
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

customerPaymentsRouter.get("/cashfree/verify/:orderId", async (req, res, next) => {
  try {
    const order = await getCashfreeOrder(req.params.orderId);
    const verified = order.order_status === "PAID";
    const payments = verified
      ? await getCashfreeOrderPayments(req.params.orderId)
      : [];
    const capturedPayment =
      payments.find((payment) => payment.is_captured) || payments[0] || null;

    res.status(verified ? 200 : 402).json({
      verified,
      order,
      payment: capturedPayment,
      payments,
      error: verified ? undefined : "Cashfree payment is not paid yet"
    });
  } catch (error) {
    next(error);
  }
});

const cashfreeRefundStatusToAppStatus = (status = "") => {
  const value = String(status).toUpperCase();
  if (["SUCCESS", "PROCESSED", "COMPLETED", "REFUNDED"].includes(value)) {
    return "completed";
  }
  if (["FAILED", "CANCELLED", "REJECTED"].includes(value)) return "failed";
  return "processing";
};

const getRefundAdminNoteForStatus = (status = "", fallback = "") => {
  const value = String(status || "").toLowerCase();
  if (value === "completed") {
    return "Refund completed to the original payment method.";
  }
  if (["processing", "reviewing"].includes(value)) {
    return "Refund has been initiated and is waiting for payment provider confirmation.";
  }
  return fallback || "";
};

const buildRefundSyncPayload = ({ refund, refundData, refundId, orderId }) => {
  const nextStatus = cashfreeRefundStatusToAppStatus(
    refund.refund_status || refund.status
  );
  const now = new Date();
  const refundDetails = {
    ...(refundData.refundDetails || {}),
    refundId,
    cfRefundId: refund.cf_refund_id || refund.cfRefundId || null,
    orderId: refund.order_id || orderId || refundData.orderId || null,
    refundAmount: refund.refund_amount || refundData.amount || null,
    refundStatus: refund.refund_status || refund.status || null,
    refundMode: refund.refund_mode || null,
    refundArn: refund.refund_arn || null,
    refundSpeed: refund.refund_speed || null,
    processedAt: refund.processed_at || refund.updated_at || now.toISOString()
  };

  return {
    nextStatus,
    payload: {
      status: nextStatus,
      refundDetails,
      cashfree: {
        ...(refundData.cashfree || {}),
        ...refundDetails,
        raw: refund,
        manualSyncedAt: now.toISOString()
      },
      adminRefundNote: getRefundAdminNoteForStatus(
        nextStatus,
        refundData.adminRefundNote
      ),
      updatedAt: now
    }
  };
};

const updateRefundFromWebhook = async (event) => {
  const refund =
    event?.data?.refund ||
    event?.data?.refund_details ||
    event?.data?.refund_entity ||
    event?.data ||
    {};
  const refundId = refund.refund_id || refund.refundId;
  if (!refundId) return { updated: false, reason: "refund_id missing" };

  const db = getDb();
  if (!db) return { updated: false, reason: "Firebase Admin is not configured" };

  const refundSnapshot = await db
    .collection("refundRequests")
    .where("cashfree.refundId", "==", refundId)
    .limit(1)
    .get();
  if (refundSnapshot.empty) {
    return { updated: false, reason: "refund request not found" };
  }

  const refundDoc = refundSnapshot.docs[0];
  const refundData = refundDoc.data();
  const nextStatus = cashfreeRefundStatusToAppStatus(
    refund.refund_status || refund.status
  );
  const payload = {
    status: nextStatus,
    refundDetails: {
      ...(refundData.refundDetails || {}),
      refundId,
      cfRefundId: refund.cf_refund_id || refund.cfRefundId || null,
      orderId: refund.order_id || refundData.orderId || null,
      refundAmount: refund.refund_amount || refundData.amount || null,
      refundStatus: refund.refund_status || refund.status || null,
      refundMode: refund.refund_mode || null,
      refundArn: refund.refund_arn || null,
      refundSpeed: refund.refund_speed || null,
      processedAt: refund.processed_at || new Date().toISOString()
    },
    cashfree: {
      ...(refundData.cashfree || {}),
      refundId,
      cfRefundId: refund.cf_refund_id || refund.cfRefundId || null,
      refundStatus: refund.refund_status || refund.status || null,
      webhookUpdatedAt: new Date().toISOString(),
      lastWebhookPayload: refund
    },
    adminRefundNote: getRefundAdminNoteForStatus(
      nextStatus,
      refundData.adminRefundNote
    ),
    updatedAt: new Date()
  };

  await refundDoc.ref.set(payload, { merge: true });
  if (refundData.bookingId) {
    await db.collection("customers").doc(refundData.bookingId).set(
      {
        refundStatus: nextStatus,
        refundId,
        cfRefundId: payload.cashfree.cfRefundId,
        updatedAt: new Date()
      },
      { merge: true }
    );
  }

  return { updated: true, status: nextStatus };
};

customerPaymentsRouter.post("/cashfree/refund/status", requireAdminUser, writeLimiter, async (req, res, next) => {
  try {
    const { refundRequestId, orderId } = req.body;
    const missing = requireFields(req.body, ["refundRequestId", "orderId"]);
    if (missing) {
      return res.status(400).json({ error: missing });
    }

    const db = getDb();
    if (!db) {
      return res.status(503).json({
        error: "Firebase Admin is not configured for refund status sync."
      });
    }

    const refundRef = db.collection("refundRequests").doc(refundRequestId);
    const refundDoc = await refundRef.get();
    if (!refundDoc.exists) {
      return res.status(404).json({ error: "Refund request not found." });
    }

    const refundData = refundDoc.data();
    const refundOrderId =
      refundData?.orderId && refundData.orderId !== "-"
        ? refundData.orderId
        : cleanString(orderId, 120);
    const storedRefundId =
      refundData?.cashfree?.refundId ||
      refundData?.refundDetails?.refundId ||
      `refund_${refundRequestId}`.replace(/[^a-zA-Z0-9_-]/g, "");

    let refund = null;
    let lookupMode = "refund_id";

    try {
      refund = await getCashfreeRefund({
        orderId: refundOrderId,
        refundId: storedRefundId
      });
    } catch (error) {
      lookupMode = "order_refunds";
      const refunds = await getCashfreeOrderRefunds(refundOrderId);
      const expectedAmount = Number(refundData.amount || 0);
      refund =
        refunds.find(
          (item) =>
            String(item.refund_id || item.refundId || "") ===
            String(storedRefundId)
        ) ||
        refunds.find(
          (item) =>
            Math.abs(Number(item.refund_amount || 0) - expectedAmount) < 0.01
        ) ||
        refunds[0] ||
        null;
    }

    if (!refund) {
      return res.status(404).json({
        error: "No Cashfree refund found for this order yet."
      });
    }

    const refundId = refund.refund_id || refund.refundId || storedRefundId;
    const { nextStatus, payload } = buildRefundSyncPayload({
      refund,
      refundData,
      refundId,
      orderId: refundOrderId
    });

    await refundRef.set(payload, { merge: true });

    if (refundData.bookingId) {
      await db.collection("customers").doc(refundData.bookingId).set(
        {
          refundStatus: nextStatus,
          refundId,
          cfRefundId: payload.cashfree.cfRefundId || null,
          refundedAmount:
            payload.refundDetails.refundAmount || refundData.amount || 0,
          updatedAt: new Date()
        },
        { merge: true }
      );
    }

    res.json({
      synced: true,
      lookupMode,
      status: nextStatus,
      refund
    });
  } catch (error) {
    next(error);
  }
});

customerPaymentsRouter.post("/cashfree/refund", requireAdminUser, writeLimiter, async (req, res, next) => {
  try {
    const {
      refundRequestId,
      bookingId,
      orderId,
      amount,
      note,
      adminId,
      adminEmail
    } = req.body;

    const missing = requireFields(req.body, ["refundRequestId", "orderId", "amount"]);
    const safeAmount = parsePositiveAmount(amount);
    if (missing || !safeAmount) {
      return res.status(400).json({
        error: missing || "A valid refund amount is required"
      });
    }

    const db = getDb();
    let refundRef = null;
    let refundData = null;
    if (db) {
      refundRef = db.collection("refundRequests").doc(refundRequestId);
      const refundDoc = await refundRef.get();
      if (refundDoc.exists) {
        refundData = refundDoc.data();
        const hasCashfreeRefund =
          refundData.refundDetails?.refundId || refundData.cashfree?.refundId;
        if (
          ["completed", "processing"].includes(refundData.status) &&
          hasCashfreeRefund
        ) {
          await refundRef.set(
            {
              adminRefundNote: getRefundAdminNoteForStatus(
                refundData.status,
                refundData.adminRefundNote
              ),
              updatedAt: new Date()
            },
            { merge: true }
          );
          return res.json({
            refunded: true,
            alreadyProcessed: true,
            refund: refundData.cashfree || null,
            status: refundData.status
          });
        }
      }
    }

    const refundOrderId =
      refundData?.orderId && refundData.orderId !== "-" ? refundData.orderId : orderId;
    const refundAmount = parsePositiveAmount(refundData?.amount || safeAmount);
    if (!refundAmount || refundAmount <= 0) {
      return res.status(400).json({
        error: "Valid refund amount is required"
      });
    }

    const refundId = `refund_${refundRequestId}`.replace(/[^a-zA-Z0-9_-]/g, "");
    const refund = await createCashfreeRefund({
      orderId: refundOrderId,
      refundId,
      amount: refundAmount,
      note: cleanString(note, 240)
    });
    const status = cashfreeRefundStatusToAppStatus(refund.refund_status);
    const now = new Date();

    const refundDetails = {
      refundId,
      cfRefundId: refund.cf_refund_id || null,
      orderId: refundOrderId,
      refundAmount: refund.refund_amount || refundAmount,
      refundStatus: refund.refund_status || null,
      refundMode: refund.refund_mode || null,
      refundArn: refund.refund_arn || null,
      refundSpeed: refund.refund_speed || null,
      processedAt: refund.processed_at || now.toISOString()
    };

    if (refundRef) {
      await refundRef.set(
        {
          status,
          adminId: adminId || null,
          adminEmail: adminEmail || req.user?.email || null,
          amount: refundAmount,
          orderId: refundOrderId,
          refundDetails,
          cashfree: {
            ...refundDetails,
            raw: refund
          },
          adminRefundNote: getRefundAdminNoteForStatus(status),
          processedAt: now,
          updatedAt: now
        },
        { merge: true }
      );
    }

    if (db && bookingId) {
      await db.collection("customers").doc(bookingId).set(
        {
          refundStatus: status,
          refundId,
          cfRefundId: refund.cf_refund_id || null,
          refundedAmount: refund.refund_amount || refundAmount,
          updatedAt: now
        },
        { merge: true }
      );
    }

    res.status(201).json({
      refunded: true,
      status,
      refund,
      persisted: Boolean(db)
    });
  } catch (error) {
    next(error);
  }
});

customerPaymentsRouter.post("/cashfree/webhook", async (req, res, next) => {
  const isValid = verifyCashfreeWebhook({
    signature: req.header("x-webhook-signature"),
    timestamp: req.header("x-webhook-timestamp"),
    rawBody: req.rawBody
  });
  const webhookType = String(req.body?.type || req.body?.event || "").toLowerCase();

  if (!isValid) {
    try {
      await logWebhookEvent({
        provider: "cashfree",
        eventType: webhookType || "invalid",
        valid: false,
        payload: req.body,
        headers: {
          signature: req.header("x-webhook-signature"),
          timestamp: req.header("x-webhook-timestamp")
        },
        result: { error: "Invalid Cashfree webhook signature" }
      });
    } catch (error) {
      console.error("Cashfree webhook log failed", error);
    }
    return res.status(401).json({ error: "Invalid Cashfree webhook signature" });
  }

  try {
    const refundUpdate = webhookType.includes("refund")
      ? await updateRefundFromWebhook(req.body)
      : { updated: false, reason: "not a refund webhook" };
    await logWebhookEvent({
      provider: "cashfree",
      eventType: webhookType,
      eventId:
        req.body?.event_id ||
        req.body?.data?.order?.order_id ||
        req.body?.data?.refund?.refund_id,
      valid: true,
      payload: req.body,
      headers: {
        timestamp: req.header("x-webhook-timestamp")
      },
      result: { refundUpdate }
    });

    res.json({ ok: true, refundUpdate });
  } catch (error) {
    next(error);
  }
});
