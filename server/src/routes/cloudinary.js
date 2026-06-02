import express from "express";
import {
  deleteServiceImage,
  uploadServiceImage
} from "../cloudinary.js";
import { createRateLimiter, requireAdminUser } from "../middleware/security.js";
import { isDataUrlImage } from "../middleware/validation.js";

export const cloudinaryRouter = express.Router();
const imageWriteLimiter = createRateLimiter({
  keyPrefix: "cloudinary-image-write",
  max: 12,
  windowMs: 60_000
});

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
