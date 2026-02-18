"use client";

import { useEffect, useState } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import { app } from "../lib/firebase";
import { api } from "../lib/api";

const useFcmToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const retrieveToken = async () => {
      try {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
          const messaging = getMessaging(app);

          // 1. Request Permission
          const permission = await Notification.requestPermission();
          setPermission(permission);

          if (permission === "granted") {
            // Dynamic SW Registration
            const swUrl = `/firebase-messaging-sw.js?apiKey=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}&projectId=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}&messagingSenderId=${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}&appId=${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}`;

            const registration = await navigator.serviceWorker.register(swUrl);

            // 2. Get Token
            const currentToken = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
              serviceWorkerRegistration: registration,
            });

            if (currentToken) {
              console.log("FCM Token:", currentToken);
              setToken(currentToken);

              // 3. Send to Backend
              try {
                await api.updateFcmToken(currentToken);
              } catch (error) {
                console.error("Failed to send FCM token to backend:", error);
              }
            } else {
              console.warn(
                "No registration token available. Request permission to generate one.",
              );
            }
          }
        }
      } catch (error) {
        console.error("An error occurred while retrieving token:", error);
      }
    };

    retrieveToken();
  }, []);

  return { token, permission };
};

export default useFcmToken;
