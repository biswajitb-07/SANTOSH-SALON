import express from "express";
import {
  deleteServiceImage,
  uploadProfilePhoto,
  uploadServiceImage
} from "../cloudinary.js";
import { config } from "../config.js";
import { getAuth, getDb } from "../firebaseAdmin.js";
import {
  createRateLimiter,
  requireAdminUser,
  requireFirebaseUser
} from "../middleware/security.js";
import { isDataUrlImage } from "../middleware/validation.js";

export const cloudinaryRouter = express.Router();
const PROFILE_PHOTO_CHANGE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const PROFILE_PHOTO_MAX_BYTES = 300 * 1024;
const imageWriteLimiter = createRateLimiter({
  keyPrefix: "cloudinary-image-write",
  max: 12,
  windowMs: 60_000
});
const profilePhotoWriteLimiter = createRateLimiter({
  keyPrefix: "cloudinary-profile-photo-write",
  max: 4,
  windowMs: 60_000
});
const profilePhotoReadLimiter = createRateLimiter({
  keyPrefix: "cloudinary-profile-photo-read",
  max: 30,
  windowMs: 60_000
});

const isCloudinaryUrl = (value = "") =>
  String(value || "").includes("res.cloudinary.com");

const getStoredProfilePhotoUrl = (userData = {}) => {
  const imageUrl = userData.photoURL || userData.photoUrl || userData.profilePhotoURL || "";
  if (!imageUrl) return "";
  if (userData.profilePhotoSource === "cloudinary") return imageUrl;
  if (userData.profilePhotoPublicId) return imageUrl;
  return isCloudinaryUrl(imageUrl) ? imageUrl : "";
};

const getDataUrlByteSize = (dataUrl = "") => {
  const base64 = String(dataUrl).split(",")[1] || "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

cloudinaryRouter.get(
  "/profile-photo/me",
  requireFirebaseUser,
  profilePhotoReadLimiter,
  async (req, res, next) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: "Authenticated user is required." });
      }

      let userData = {};
      const db = getDb();
      if (db) {
        try {
          const userDoc = await db.collection("users").doc(uid).get();
          userData = userDoc.exists ? userDoc.data() || {} : {};
        } catch {
          userData = {};
        }
      }

      let authPhotoURL = "";
      const firebaseAuth = getAuth();
      if (firebaseAuth) {
        try {
          const authUser = await firebaseAuth.getUser(uid);
          authPhotoURL = isCloudinaryUrl(authUser.photoURL) ? authUser.photoURL : "";
        } catch {
          authPhotoURL = "";
        }
      }

      const imageUrl = getStoredProfilePhotoUrl(userData) || authPhotoURL;
      return res.json({
        imageUrl,
        imagePublicId: userData.profilePhotoPublicId || "",
        profilePhotoSource: imageUrl ? "cloudinary" : "",
        profilePhotoUpdatedAt: userData.profilePhotoUpdatedAt || null
      });
    } catch (error) {
      return next(error);
    }
  }
);

cloudinaryRouter.post(
  "/profile-photo/upload",
  requireFirebaseUser,
  profilePhotoWriteLimiter,
  async (req, res, next) => {
    try {
      const { imageDataUrl } = req.body;
      const uid = req.user?.uid;
      const email = String(req.user?.email || "").toLowerCase();
      const isAdmin = config.security.adminAllowedEmails.includes(email);

      if (!uid) {
        return res.status(401).json({ error: "Authenticated user is required." });
      }

      if (!imageDataUrl || !isDataUrlImage(imageDataUrl)) {
        return res.status(400).json({
          error: "A valid PNG, JPG, JPEG, or WEBP image data URL is required"
        });
      }

      if (getDataUrlByteSize(imageDataUrl) > PROFILE_PHOTO_MAX_BYTES) {
        return res.status(413).json({
          error: "Profile photo should be 300 KB or smaller."
        });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Firebase Admin is not configured." });
      }

      const userDocRef = db.collection("users").doc(uid);
      let userData = {};
      try {
        const userDoc = await userDocRef.get();
        userData = userDoc.exists ? userDoc.data() || {} : {};
      } catch {
        userData = {};
      }
      const lastChangedAt =
        userData.profilePhotoUpdatedAt?.toDate?.() ||
        (userData.profilePhotoUpdatedAt
          ? new Date(userData.profilePhotoUpdatedAt)
          : null);

      if (
        !isAdmin &&
        lastChangedAt instanceof Date &&
        !Number.isNaN(lastChangedAt.getTime())
      ) {
        const nextAllowedAt = new Date(
          lastChangedAt.getTime() + PROFILE_PHOTO_CHANGE_WINDOW_MS
        );
        if (Date.now() < nextAllowedAt.getTime()) {
          return res.status(429).json({
            error: "Profile photo can be changed once every 2 days.",
            nextAllowedAt: nextAllowedAt.toISOString()
          });
        }
      }

      const uploadedImage = await uploadProfilePhoto({ imageDataUrl, uid });
      const now = new Date();
      const payload = {
        uid,
        email: req.user.email || userData.email || "",
        name: req.user.name || userData.name || userData.displayName || "Customer",
        photoURL: uploadedImage.imageUrl,
        photoUrl: uploadedImage.imageUrl,
        profilePhotoURL: uploadedImage.imageUrl,
        profilePhotoPublicId: uploadedImage.imagePublicId,
        profilePhotoSource: "cloudinary",
        profilePhotoUpdatedAt: now,
        updatedAt: now
      };

      const firebaseAuth = getAuth();
      if (firebaseAuth) {
        await firebaseAuth.updateUser(uid, {
          photoURL: uploadedImage.imageUrl
        });
      }

      let firestoreSaved = false;
      try {
        await userDocRef.set(payload, { merge: true });
        firestoreSaved = true;
      } catch {
        firestoreSaved = false;
      }

      res.status(201).json({
        imageUrl: uploadedImage.imageUrl,
        imagePublicId: uploadedImage.imagePublicId,
        firestoreSaved,
        profilePhotoUpdatedAt: now.toISOString(),
        nextAllowedAt: isAdmin
          ? null
          : new Date(now.getTime() + PROFILE_PHOTO_CHANGE_WINDOW_MS).toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

cloudinaryRouter.use(requireAdminUser);

cloudinaryRouter.post("/service-image/upload", imageWriteLimiter, async (req, res, next) => {
  try {
    const { imageDataUrl } = req.body;

    if (!imageDataUrl || !isDataUrlImage(imageDataUrl)) {
      return res.status(400).json({
        error: "A valid PNG, JPG, JPEG, or WEBP image data URL is required"
      });
    }

    if (imageDataUrl.length > 11 * 1024 * 1024) {
      return res.status(413).json({ error: "Image payload is too large" });
    }

    const image = await uploadServiceImage({ imageDataUrl });
    res.status(201).json(image);
  } catch (error) {
    next(error);
  }
});

cloudinaryRouter.post("/service-image/delete", imageWriteLimiter, async (req, res, next) => {
  try {
    const { publicId } = req.body;
    const result = await deleteServiceImage({ publicId });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
