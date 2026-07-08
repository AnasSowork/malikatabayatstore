"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { HERO_POSTER, HERO_VIDEOS, pickHeroVideoIndex } from "@/lib/hero-videos";

export function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoIndex] = useState(() => pickHeroVideoIndex());
  const [useVideo, setUseVideo] = useState(true);
  const [ready, setReady] = useState(false);

  const source = useMemo(() => HERO_VIDEOS[videoIndex] ?? HERO_VIDEOS[0], [videoIndex]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setUseVideo(false);
      return;
    }

    const el = videoRef.current;
    if (!el) return;

    el.muted = true;
    const play = () => {
      void el.play().catch(() => setUseVideo(false));
    };
    play();
    el.addEventListener("canplay", play);
    return () => el.removeEventListener("canplay", play);
  }, [source.src]);

  return (
    <div className="hero-zoom absolute inset-0 z-0">
      {useVideo ? (
        <video
          ref={videoRef}
          key={source.src}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={HERO_POSTER}
          aria-hidden
          onLoadedData={() => setReady(true)}
          onError={() => setUseVideo(false)}
        >
          <source src={source.src} type="video/mp4" />
        </video>
      ) : null}

      <Image
        src={HERO_POSTER}
        alt=""
        fill
        priority
        className={`object-cover transition-opacity duration-700 ${useVideo && ready ? "opacity-0" : "opacity-100"}`}
        sizes="100vw"
        unoptimized
      />
    </div>
  );
}
