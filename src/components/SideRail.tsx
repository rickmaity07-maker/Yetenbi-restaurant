"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import Stela, { STELA_FLOORS } from "./heritage/Stela";
import { useLanguage } from "@/lib/language";

const chapters = [
  { id: "willkommen", label: "Willkommen" },
  { id: "platte", label: "Die Platte" },
  { id: "speisekarte", label: "Speisekarte" },
  { id: "kaffee", label: "Drei Runden" },
  { id: "besuch", label: "Anfahrt" },
  { id: "reservieren", label: "Reservierung" },
];

/** A small Aksum stela on the right edge: its storeys light up as you travel down the page, fully lit at the end. */
export default function SideRail() {
  const [current, setCurrent] = useState(-1);
  const { t } = useLanguage();
  const [lit, setLit] = useState(0);
  const { scrollY, scrollYProgress } = useScroll();
  // Stay out of the hero, which has its own stelae; fade in once it has scrolled away.
  const show = useTransform(scrollY, (y) =>
    typeof window === "undefined"
      ? 0
      : Math.min(1, Math.max(0, (y - window.innerHeight * 0.55) / (window.innerHeight * 0.3))),
  );

  // One storey per sixth of the page, so the stela is fully lit when you reach the bottom.
  useMotionValueEvent(scrollYProgress, "change", (v) =>
    setLit(Math.min(STELA_FLOORS, Math.ceil(v * STELA_FLOORS - 0.02))),
  );

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setCurrent(chapters.findIndex((c) => c.id === e.target.id));
        }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    chapters.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const label = current >= 0 ? t.rail[current] : undefined;

  return (
    <motion.aside
      style={{ opacity: show }}
      aria-hidden
      className="pointer-events-none fixed right-5 top-1/2 z-30 hidden will-change-[opacity] -translate-y-1/2 flex-col items-center gap-4 xl:flex"
    >
      <Stela className="h-72 w-auto text-gold/90 drop-shadow-[0_0_14px_rgba(201,162,74,0.3)]" lit={lit} />
      <div className="h-28 w-6">
        <AnimatePresence mode="wait">
          {label && (
            <motion.p
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="whitespace-nowrap text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-cream/68 [writing-mode:vertical-rl]"
            >
              {label}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
