"use client";

import { useEffect, useRef, useState } from "react";

type Ember = { left: number; size: number; delay: number; duration: number; drift: number; opacity: number };

/**
 * Glowing embers drifting upward, like sparks from the coffee brazier.
 * Performance: particles exist only while the section is on screen (each running animation is a GPU layer),
 * phones get half as many, and reduced-motion users get none. Client-only so randomness never mismatches SSR.
 */
export default function Embers({ count = 34, className = "" }: { count?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [embers, setEmbers] = useState<Ember[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const n = window.innerWidth < 768 ? Math.ceil(count / 2) : count;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmbers(
      Array.from({ length: n }, () => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 12,
        duration: 9 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 160,
        opacity: 0.35 + Math.random() * 0.6,
      })),
    );
    const el = ref.current?.parentElement;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, [count]);

  return (
    <div ref={ref} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {visible &&
        embers.map((e, i) => (
          <span
            key={i}
            className="ember absolute bottom-[-10px] rounded-full"
            style={
              {
                left: `${e.left}%`,
                width: e.size * 2,
                height: e.size * 2,
                animationDelay: `${e.delay}s`,
                animationDuration: `${e.duration}s`,
                "--drift": `${e.drift}px`,
                "--o": e.opacity,
              } as React.CSSProperties
            }
          />
        ))}
    </div>
  );
}
