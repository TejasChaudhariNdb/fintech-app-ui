"use client";

import { useEffect, useState } from "react";
import useFcmToken from "../hooks/useFcmToken";
import { getMessaging, onMessage } from "firebase/messaging";
import { app } from "../lib/firebase";
import { Bell, X } from "lucide-react";

const FcmManager = () => {
  const { permission, requestPermission } = useFcmToken();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show banner only if permission is strictly default (not granted, not denied)
    // and we are reasonably sure we are on client side.
    if (typeof window !== "undefined" && permission === "default") {
      // Maybe wait a bit before showing to not be too aggressive
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [permission]);

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
        // Background messages are handled by firebase-messaging-sw.js
        if (payload.notification) {
          const { title, body } = payload.notification;
          new Notification(title || "New Message", {
            body,
            icon: "/icon-192x192.png",
          });
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [permission]);

  if (!showBanner || permission !== "default") return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 md:max-w-md">
      <div className="bg-linear-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-4 text-white flex items-start gap-4 animate-in slide-in-from-bottom-5">
        <div className="bg-white/20 p-2 rounded-lg shrink-0 mt-1">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">Turn on Notifications</h4>
          <p className="text-xs text-blue-100 mb-3">
            Get instant alerts on portfolio updates, goal milestones, and
            critical price changes.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowBanner(false);
                requestPermission();
              }}
              className="bg-white text-blue-700 hover:bg-blue-50 text-xs px-3 py-1.5 rounded-md font-medium transition-colors">
              Enable Now
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="bg-transparent hover:bg-white/10 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors border border-white/20">
              Maybe Later
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-white/60 hover:text-white shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FcmManager;
