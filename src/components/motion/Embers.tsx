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
    const amount = window.innerWidth < 768 ? Math.ceil(count / 2) : count;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmbers(
      Array.from({ length: amount }, () => ({
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
    const io = new IntersectionObserver(([ember]) => setVisible(ember.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, [count]);

  return (
    <div ref={ref} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {visible &&
        embers.map((ember, index) => (
          <span
            key={index}
            className="ember absolute bottom-[-10px] rounded-full"
            style={
              {
                left: `${ember.left}%`,
                width: ember.size * 2,
                height: ember.size * 2,
                animationDelay: `${ember.delay}s`,
                animationDuration: `${ember.duration}s`,
                "--drift": `${ember.drift}px`,
                "--o": ember.opacity,
              } as React.CSSProperties
            }
          />
        ))}
    </div>
  );
}
