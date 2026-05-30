import crypto from "node:crypto";
import { config } from "./config.js";

const ensureCloudinaryConfig = () => {
  if (
    !config.cloudinary.cloudName ||
    !config.cloudinary.apiKey ||
    !config.cloudinary.apiSecret
  ) {
    const error = new Error("Cloudinary credentials are missing.");
    error.statusCode = 500;
    throw error;
  }
};

const signParams = (params) => {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${payload}${config.cloudinary.apiSecret}`)
    .digest("hex");
};

const postCloudinaryForm = async (endpoint, params) => {
  ensureCloudinaryConfig();

  const formData = new FormData();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/${endpoint}`,
    {
      method: "POST",
      body: formData
    }
  );
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error?.message || "Cloudinary request failed");
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

export const uploadServiceImage = async ({ imageDataUrl }) => {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    folder: config.cloudinary.folder,
    timestamp
  };
  const signature = signParams(paramsToSign);

  const data = await postCloudinaryForm("image/upload", {
    file: imageDataUrl,
    folder: config.cloudinary.folder,
    timestamp,
    api_key: config.cloudinary.apiKey,
    signature
  });

  return {
    imageUrl: data.secure_url,
    imagePublicId: data.public_id
  };
};

export const deleteServiceImage = async ({ publicId }) => {
  if (!publicId) return { deleted: false, reason: "publicId missing" };

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    public_id: publicId,
    timestamp
  };
  const signature = signParams(paramsToSign);

  const data = await postCloudinaryForm("image/destroy", {
    public_id: publicId,
    timestamp,
    api_key: config.cloudinary.apiKey,
    signature
  });

  return {
    deleted: data.result === "ok" || data.result === "not found",
    result: data.result
  };
};
