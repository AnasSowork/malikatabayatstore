"use client";

import { useEffect } from "react";
import { captureFirstTouchUtmFromLocation } from "@/lib/meta-utm";
import { captureMetaBrowserIds } from "@/lib/meta-browser-cookies";

/** Capture first-touch UTM and Meta browser ids without altering the URL. */
export function AttributionCapture() {
  useEffect(() => {
    captureFirstTouchUtmFromLocation();
    captureMetaBrowserIds();
  }, []);

  return null;
}
