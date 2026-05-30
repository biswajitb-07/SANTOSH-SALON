import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import {
  deleteServiceImage,
  uploadServiceImage
} from "../../server/src/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");
const assetRoot = path.resolve(__dirname, "../public");

const readEnv = () => {
  const env = {};
  const content = fs.readFileSync(envPath, "utf8");

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separator = trimmed.indexOf("=");
    if (separator === -1) return;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^"|"$/g, "");
    env[key] = value;
  });

  return env;
};

const localPngToDataUrl = (assetPath) => {
  const buffer = fs.readFileSync(path.join(assetRoot, assetPath));
  return `data:image/png;base64,${buffer.toString("base64")}`;
};

const remoteImageToDataUrl = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Image download failed (${response.status}): ${url}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
};

const env = readEnv();
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
});

const db = getFirestore(app);
const servicePhotos = [
  {
    id: "classic-haircut",
    source: () => localPngToDataUrl("assets/haircut-feature.png")
  },
  {
    id: "beard-styling",
    source: () =>
      remoteImageToDataUrl(
        "https://images.pexels.com/photos/3998413/pexels-photo-3998413.jpeg?auto=compress&cs=tinysrgb&w=1400"
      )
  },
  {
    id: "hair-wash",
    source: () =>
      remoteImageToDataUrl(
        "https://images.pexels.com/photos/33448217/pexels-photo-33448217.jpeg?auto=compress&cs=tinysrgb&w=1400"
      )
  },
  {
    id: "facial-grooming",
    source: () =>
      remoteImageToDataUrl(
        "https://images.pexels.com/photos/12302331/pexels-photo-12302331.jpeg?auto=compress&cs=tinysrgb&w=1400"
      )
  }
];

for (const photo of servicePhotos) {
  const serviceRef = doc(db, "services", photo.id);
  const serviceSnap = await getDoc(serviceRef);
  const previousPublicId = serviceSnap.exists()
    ? serviceSnap.data().imagePublicId
    : "";
  const imageDataUrl = await photo.source();
  const uploaded = await uploadServiceImage({ imageDataUrl });

  await setDoc(
    serviceRef,
    {
      imageUrl: uploaded.imageUrl,
      imagePublicId: uploaded.imagePublicId
    },
    { merge: true }
  );

  if (previousPublicId && previousPublicId !== uploaded.imagePublicId) {
    await deleteServiceImage({ publicId: previousPublicId });
  }

  console.log(`Updated realistic service image: ${photo.id}`);
}

console.log("Realistic service photo replacement completed.");
