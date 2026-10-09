"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useLenis } from "lenis/react";
import { useState } from "react";

/** Thin gold reading bar along the top plus a circular back-to-top button. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const [visible, setVisible] = useState(false);
  const lenis = useLenis();

  useMotionValueEvent(scrollYProgress, "change", (v) => setVisible(v > 0.08));

  return (
    <>
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left will-change-transform bg-gradient-to-r from-gold via-gold-soft to-gold shadow-[0_0_12px_rgba(231,205,138,0.8)]"
      />
      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            aria-label="Nach oben"
            onClick={() => (lenis ? lenis.scrollTo(0, { duration: 2 }) : window.scrollTo({ top: 0 }))}
            className="group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink/80 backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          >
            <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
              <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(244,236,220,0.12)" strokeWidth="1.5" />
              <motion.circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke="#c9a24a"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ pathLength: progress }}
              />
            </svg>
            <span className="text-gold-soft transition-transform duration-500 group-hover:-translate-y-1">↑</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
