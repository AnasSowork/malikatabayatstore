"use client";

import { useEffect } from "react";
import { flushPendingPurchase } from "@/lib/meta-pixel-events";

export function ThankYouPurchaseTracker() {
  useEffect(() => {
    flushPendingPurchase();
  }, []);

  return null;
}
