import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { uploadServiceImage } from "../../server/src/cloudinary.js";

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

const toDataUrl = (assetPath) => {
  const absolutePath = path.join(assetRoot, assetPath);
  const buffer = fs.readFileSync(absolutePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
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
const serviceAssets = [
  ["classic-haircut", "assets/haircut-feature.png"],
  ["beard-styling", "assets/haircut-styles.png"],
  ["hair-wash", "assets/haircut-styles.png"],
  ["facial-grooming", "assets/salon-hero.png"]
];

for (const [serviceId, assetPath] of serviceAssets) {
  const serviceRef = doc(db, "services", serviceId);
  const serviceSnap = await getDoc(serviceRef);

  if (serviceSnap.exists() && serviceSnap.data().imagePublicId) {
    console.log(`Skipped service with Cloudinary image: ${serviceId}`);
    continue;
  }

  const uploaded = await uploadServiceImage({ imageDataUrl: toDataUrl(assetPath) });
  await setDoc(
    serviceRef,
    {
      imageUrl: uploaded.imageUrl,
      imagePublicId: uploaded.imagePublicId
    },
    { merge: true }
  );
  console.log(`Migrated service image: ${serviceId}`);
}

console.log("Service image migration completed.");
