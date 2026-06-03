import express from "express";
import { getAuth, getDb } from "../firebaseAdmin.js";
import { createRateLimiter, requireAdminUser } from "../middleware/security.js";

export const adminUsersRouter = express.Router();
const adminUserWriteLimiter = createRateLimiter({
  keyPrefix: "admin-users-write",
  max: 20,
  windowMs: 60_000
});

const cleanValue = (value) => String(value || "").trim();
const ADMIN_USER_RELATED_DOC_LIMIT = 120;

const addQueryDocs = async (db, docsMap, collectionName, fieldName, fieldValue) => {
  const value = cleanValue(fieldValue);
  if (!value || value === "-") return;

  const snapshot = await db
    .collection(collectionName)
    .where(fieldName, "==", value)
    .limit(ADMIN_USER_RELATED_DOC_LIMIT)
    .get();

  snapshot.docs.forEach((snapshotDoc) => {
    docsMap.set(snapshotDoc.ref.path, snapshotDoc);
  });
};

const commitDeletes = async (db, snapshotDocs) => {
  for (let index = 0; index < snapshotDocs.length; index += 450) {
    const batch = db.batch();
    snapshotDocs.slice(index, index + 450).forEach((snapshotDoc) => {
      batch.delete(snapshotDoc.ref);
    });
    await batch.commit();
  }
};

adminUsersRouter.patch("/:uid/block", requireAdminUser, adminUserWriteLimiter, async (req, res, next) => {
  try {
    const db = getDb();
    const auth = getAuth();
    if (!db || !auth) {
      return res.status(503).json({ error: "Firebase Admin is not configured." });
    }

    const uid = cleanValue(req.params.uid);
    const blocked = req.body?.blocked === true;
    if (!uid) return res.status(400).json({ error: "User uid is required." });
    if (uid === req.user?.uid) {
      return res.status(400).json({ error: "You cannot block your own admin account." });
    }

    await db.collection("users").doc(uid).set(
      {
        blocked,
        blockedAt: blocked ? new Date() : null,
        unblockedAt: blocked ? null : new Date(),
        updatedAt: new Date()
      },
      { merge: true }
    );

    try {
      await auth.updateUser(uid, { disabled: blocked });
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }

    return res.json({ ok: true, blocked });
  } catch (error) {
    return next(error);
  }
});

adminUsersRouter.delete("/:uid", requireAdminUser, adminUserWriteLimiter, async (req, res, next) => {
  try {
    const db = getDb();
    const auth = getAuth();
    if (!db || !auth) {
      return res.status(503).json({ error: "Firebase Admin is not configured." });
    }

    const uid = cleanValue(req.params.uid);
    if (!uid) return res.status(400).json({ error: "User uid is required." });
    if (uid === req.user?.uid) {
      return res.status(400).json({ error: "You cannot delete your own admin account." });
    }

    const userDocRef = db.collection("users").doc(uid);
    const userSnapshot = await userDocRef.get();
    const userData = userSnapshot.exists ? userSnapshot.data() : {};
    const email = cleanValue(req.body?.email || userData.email);
    const phone = cleanValue(req.body?.phone || userData.phone || userData.mobile);

    const docsMap = new Map();
    if (userSnapshot.exists) docsMap.set(userDocRef.path, userSnapshot);

    await addQueryDocs(db, docsMap, "customers", "userId", uid);
    await addQueryDocs(db, docsMap, "customers", "email", email);
    await addQueryDocs(db, docsMap, "customers", "mobile", phone);
    await addQueryDocs(db, docsMap, "customers", "phone", phone);

    const bookingDocs = [...docsMap.values()].filter(
      (snapshotDoc) => snapshotDoc.ref.parent.id === "customers"
    );

    await addQueryDocs(db, docsMap, "refundRequests", "customerEmail", email);
    await addQueryDocs(db, docsMap, "refundRequests", "customerMobile", phone);
    await Promise.all(
      bookingDocs.map((bookingDoc) =>
        addQueryDocs(db, docsMap, "refundRequests", "bookingId", bookingDoc.id)
      )
    );

    await addQueryDocs(db, docsMap, "contactIssues", "email", email);
    await addQueryDocs(db, docsMap, "contactIssues", "mobile", phone);

    await commitDeletes(db, [...docsMap.values()]);

    try {
      await auth.deleteUser(uid);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }

    return res.json({
      ok: true,
      deletedDocs: docsMap.size,
      deletedAuthUser: true
    });
  } catch (error) {
    return next(error);
  }
});
