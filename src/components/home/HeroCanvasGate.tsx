"use client";

import dynamic from "next/dynamic";

const HeroThreeBackdrop = dynamic(() => import("./HeroThreeBackdrop"), {
  ssr: false,
  loading: () => null,
});

export function HeroCanvasGate() {
  return <HeroThreeBackdrop />;
}
