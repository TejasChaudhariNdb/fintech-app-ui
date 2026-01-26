"use client";

import { useEffect, useState } from "react";

export function useIsDemo() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Check if running in browser
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("user_email");
      const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;

      if (
        email &&
        demoEmail &&
        email.toLowerCase() === demoEmail.toLowerCase()
      ) {
        setIsDemo(true);
      }
    }
  }, []);

  return isDemo;
}
