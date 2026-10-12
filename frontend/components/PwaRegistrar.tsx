"use client";

import { useEffect } from "react";

export function PwaRegistrar() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          // Service worker registered safely
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
