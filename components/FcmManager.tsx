"use client";

import { useEffect } from "react";
import useFcmToken from "../hooks/useFcmToken";
import { getMessaging, onMessage } from "firebase/messaging";
import { app } from "../lib/firebase";

const FcmManager = () => {
  const { token, permission } = useFcmToken();

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      permission === "granted"
    ) {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("Foreground Message received:", payload);
        // Customize how you show foreground notifications here (e.g. Toaster)
        // Note: Background messages are handled by firebase-messaging-sw.js
        if (payload.notification) {
          const { title, body } = payload.notification;
          // Example: alert(`${title}: ${body}`);
          // Or better, use a toast library like try calling a function passed via context
          new Notification(title || "New Message", {
            body,
            icon: "/icon.png", // customize
          });
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [permission]);

  return null; // This component handles side-effects only
};

export default FcmManager;
