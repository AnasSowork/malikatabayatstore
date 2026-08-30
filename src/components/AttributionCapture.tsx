"use client";

import { useEffect } from "react";
import { captureFirstTouchUtmFromLocation } from "@/lib/meta-utm";
import { captureFirstTouchMetaAttribution } from "@/lib/meta-first-touch";
import { captureMetaBrowserIds } from "@/lib/meta-browser-cookies";

/** Capture first-touch UTM, fbclid, and Meta browser ids without altering the URL. */
export function AttributionCapture() {
  useEffect(() => {
    captureFirstTouchMetaAttribution();
    captureFirstTouchUtmFromLocation();
    captureMetaBrowserIds();
  }, []);

  return null;
}
