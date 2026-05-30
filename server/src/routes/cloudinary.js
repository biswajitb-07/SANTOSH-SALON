import express from "express";
import {
  deleteServiceImage,
  uploadServiceImage
} from "../cloudinary.js";

export const cloudinaryRouter = express.Router();

cloudinaryRouter.post("/service-image/upload", async (req, res, next) => {
  try {
    const { imageDataUrl } = req.body;

    if (!imageDataUrl) {
      return res.status(400).json({ error: "imageDataUrl is required" });
    }

    const image = await uploadServiceImage({ imageDataUrl });
    res.status(201).json(image);
  } catch (error) {
    next(error);
  }
});

cloudinaryRouter.post("/service-image/delete", async (req, res, next) => {
  try {
    const { publicId } = req.body;
    const result = await deleteServiceImage({ publicId });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
