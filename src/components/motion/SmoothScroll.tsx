"use client";

import { ReactLenis } from "lenis/react";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.085, anchors: { offset: -24 }, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
