import { getDb } from "./firebaseAdmin.js";

const safeJson = (value) => {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch {
    return {};
  }
};

export const logWebhookEvent = async ({
  provider,
  eventType,
  eventId,
  valid,
  payload,
  headers,
  result
}) => {
  const db = getDb();
  if (!db) return { saved: false, reason: "Firebase Admin is not configured" };

  const id =
    eventId ||
    `${provider || "webhook"}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

  await db.collection("webhookEvents").doc(String(id)).set(
    {
      provider: provider || "unknown",
      eventType: eventType || "unknown",
      valid: Boolean(valid),
      payload: safeJson(payload),
      headers: safeJson(headers),
      result: safeJson(result),
      receivedAt: new Date(),
      updatedAt: new Date()
    },
    { merge: true }
  );

  return { saved: true, id };
};
