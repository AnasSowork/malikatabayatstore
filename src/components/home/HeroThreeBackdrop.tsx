"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function FloatingRings() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.y = t * 0.11;
    g.rotation.x = Math.sin(t * 0.25) * 0.06;
    g.position.y = Math.sin(t * 0.35) * 0.08;
  });

  const rings = useMemo(
    () => [
      { radius: 2.35, tube: 0.012, rot: [0.9, 0.4, 0.2] as const, opacity: 0.2 },
      { radius: 1.65, tube: 0.01, rot: [0.2, 1.1, 0.5] as const, opacity: 0.14 },
      { radius: 3.1, tube: 0.008, rot: [0.5, 0.2, 0.9] as const, opacity: 0.1 },
    ],
    [],
  );

  return (
    <group ref={group}>
      {rings.map((r, i) => (
        <mesh key={i} rotation={r.rot}>
          <torusGeometry args={[r.radius, r.tube, 32, 180]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={r.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function HeroThreeBackdrop() {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 42 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.75]}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.6} />
        <FloatingRings />
      </Canvas>
    </div>
  );
}
