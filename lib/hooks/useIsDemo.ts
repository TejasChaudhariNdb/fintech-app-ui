"use client";

import { useEffect, useState } from "react";

export function isDemoUser(): boolean {
  if (typeof window === "undefined") return false;
  const email = localStorage.getItem("user_email");
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;
  const isDemoSession = sessionStorage.getItem("is_demo_session") === "true";

  if (isDemoSession) return true;
  if (email && demoEmail && email.toLowerCase() === demoEmail.toLowerCase()) {
    return true;
  }
  return false;
}

export function useIsDemo() {
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return isDemoUser();
    }
    return false;
  });

  useEffect(() => {
    setIsDemo(isDemoUser());
  }, []);

  return isDemo;
}
