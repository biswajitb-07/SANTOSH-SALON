import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

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

const services = [
  {
    id: "classic-haircut",
    title: "Classic Haircut",
    time: "25 min",
    amount: 120,
    imageUrl: "/assets/haircut-feature.png",
    sortOrder: 1
  },
  {
    id: "beard-styling",
    title: "Beard Styling",
    time: "15 min",
    amount: 80,
    imageUrl: "/assets/haircut-styles.png",
    sortOrder: 2
  },
  {
    id: "hair-wash",
    title: "Hair Wash",
    time: "12 min",
    amount: 70,
    imageUrl: "/assets/haircut-styles.png",
    sortOrder: 3
  },
  {
    id: "facial-grooming",
    title: "Facial Grooming",
    time: "35 min",
    amount: 250,
    imageUrl: "/assets/salon-hero.png",
    sortOrder: 4
  }
];

for (const service of services) {
  const { id, amount, ...data } = service;
  await setDoc(
    doc(db, "services", id),
    {
      ...data,
      amount,
      price: `Rs. ${amount}`,
      active: true,
      seeded: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
  console.log(`Seeded service: ${data.title}`);
}

console.log("Services seed completed.");
