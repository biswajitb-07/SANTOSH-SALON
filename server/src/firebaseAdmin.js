import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

let db = null;
let auth = null;

const getServiceAccount = () => {
  if (config.firebase.serviceAccountFile) {
    const serviceAccountPath = path.resolve(
      process.cwd(),
      config.firebase.serviceAccountFile
    );
    if (fs.existsSync(serviceAccountPath)) {
      return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    }

    console.warn(
      `Firebase service account file not found: ${serviceAccountPath}. Falling back to FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.`
    );
  }

  if (config.firebase.serviceAccountBase64) {
    const json = Buffer.from(
      config.firebase.serviceAccountBase64,
      "base64"
    ).toString("utf8");
    return JSON.parse(json);
  }

  if (
    config.firebase.projectId &&
    config.firebase.clientEmail &&
    config.firebase.privateKey
  ) {
    return {
      project_id: config.firebase.projectId,
      client_email: config.firebase.clientEmail,
      private_key: config.firebase.privateKey
    };
  }

  return null;
};

export const getDb = () => {
  if (db) return db;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  db = admin.firestore();
  return db;
};

export const getAuth = () => {
  if (auth) return auth;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  auth = admin.auth();
  return auth;
};

export const verifyFirebaseIdToken = async (idToken) => {
  const firebaseAuth = getAuth();
  if (!firebaseAuth) {
    const error = new Error("Firebase Admin is not configured.");
    error.statusCode = 503;
    throw error;
  }

  return firebaseAuth.verifyIdToken(idToken);
};
