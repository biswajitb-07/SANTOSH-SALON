import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEnvPath = path.resolve(__dirname, "../.env");
const rootEnvPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: serverEnvPath, override: true });

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const optional = (name) => process.env[name]?.trim() || "";

export const config = {
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  adminUrl: process.env.ADMIN_URL || "http://localhost:5174",
  serverUrl: process.env.SERVER_URL || "http://localhost:5000",
  cashfree: {
    env: process.env.CASHFREE_ENV || "sandbox",
    baseUrl:
      process.env.CASHFREE_BASE_URL ||
      (process.env.CASHFREE_ENV === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg"),
    apiVersion: process.env.CASHFREE_API_VERSION || "2025-01-01",
    appId: required("CASHFREE_APP_ID"),
    secretKey: required("CASHFREE_SECRET_KEY")
  },
  firebase: {
    serviceAccountFile: process.env.FIREBASE_SERVICE_ACCOUNT_FILE,
    serviceAccountBase64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  },
  razorpay: {
    keyId: optional("RAZORPAY_KEY_ID"),
    keySecret: optional("RAZORPAY_KEY_SECRET"),
    webhookSecret: optional("RAZORPAY_WEBHOOK_SECRET")
  },
  cloudinary: {
    cloudName: optional("CLOUDINARY_CLOUD_NAME") || optional("CLOUD_NAME"),
    apiKey: optional("CLOUDINARY_API_KEY") || optional("CLOUD_API_KEY"),
    apiSecret: optional("CLOUDINARY_API_SECRET") || optional("CLOUD_API_SECRET"),
    folder: optional("CLOUDINARY_FOLDER") || "salon-services"
  }
};
