"use client";

import { useEffect, useRef } from "react";
import { flushPendingPurchase } from "@/lib/meta-pixel-events";

export function ThankYouPurchaseTracker() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    flushPendingPurchase();
  }, []);

  return null;
}
