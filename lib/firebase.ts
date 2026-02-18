"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Analytics (optional)
// const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Messaging
export const getMessagingInstance = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
    console.warn("Firebase Messaging is not supported in this environment.");
    return null;
  } catch (err) {
    console.error("Error checking messaging support:", err);
    return null;
  }
};

export { app };
