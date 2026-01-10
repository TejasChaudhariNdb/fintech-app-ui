"use client";

import { useCallback } from "react";

export const useHaptic = () => {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const light = () => vibrate(10);
  const medium = () => vibrate(20);
  const heavy = () => vibrate(30);
  const success = () => vibrate([10, 30, 10]);
  const error = () => vibrate([30, 50, 30]);

  return { light, medium, heavy, success, error };
};
