"use client";

import { useEffect, useState, type RefObject } from "react";

/** True while the element is near the viewport — used to pause WebGL render loops off-screen. */
export function useNearViewport(ref: RefObject<HTMLElement | null>, margin = "200px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, margin]);
  return near;
}
