"use client";

import dynamic from "next/dynamic";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useLenis } from "lenis/react";
import { useCallback, useEffect, useState } from "react";
import { useIntro } from "./IntroState";
import { useLanguage } from "@/lib/language";

const ParticleJourney = dynamic(() => import("../three/ParticleJourney"), { ssr: false });

const DURATION = 13.5;
const ease = [0.76, 0, 0.24, 1] as const;

const captions = [
  { range: [0.0, 0.03, 0.08, 0.11], text: "Aus tausend Bohnen", am: "ቡና" },
  { range: [0.18, 0.22, 0.31, 0.35], text: "frisch geröstet", am: "ማቁላት" },
  { range: [0.42, 0.46, 0.55, 0.59], text: "in der Jebena gebrüht", am: "ጀበና" },
  { range: [0.66, 0.7, 0.83, 0.87], text: "für Sie serviert", am: "እንኳን ደህና መጡ" },
];

function Caption({
  progress,
  range,
  text,
  am,
}: {
  progress: MotionValue<number>;
  range: number[];
  text: string;
  am: string;
}) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const y = useTransform(progress, [range[0], range[3]], [24, -24]);
  const filter = useTransform(progress, range, ["blur(10px)", "blur(0px)", "blur(0px)", "blur(10px)"]);
  return (
    <motion.div style={{ opacity, y, filter }} className="absolute inset-x-0 bottom-[11%] px-6 text-center">
      <p className="font-display text-4xl italic leading-[1.15] text-cream md:text-6xl">{text}</p>
      <p className="mt-3 font-ethiopic text-lg text-gold/75" lang="am">
        {am}
      </p>
    </motion.div>
  );
}

/** Full-screen particle story that plays by itself on load, then lifts away to reveal the site. */
export default function Intro() {
  const { done, finish } = useIntro();
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const lenis = useLenis();
  const progress = useMotionValue(0);
  const [leaving, setLeaving] = useState(false);
  const flash = useTransform(progress, [0.84, 0.88, 0.95], [0, 0.45, 0]);
  const bar = useTransform(progress, [0, 1], [0, 1]);

  const leave = useCallback(() => setLeaving(true), []);

  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (reduce) {
      finish();
      return;
    }
    // If WebGL never comes up, don't trap the visitor behind a black screen.
    if (!ready) {
      const fallback = setTimeout(leave, 5000);
      return () => clearTimeout(fallback);
    }
    const controls = animate(progress, 1, { duration: DURATION, ease: "linear", onComplete: leave });
    return () => controls.stop();
  }, [reduce, ready, progress, leave, finish]);

  // Hold the page still while the intro owns the screen.
  useEffect(() => {
    if (done) return;
    window.scrollTo(0, 0);
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
    };
  }, [done, lenis]);

  return (
    <AnimatePresence onExitComplete={finish}>
      {!leaving && !reduce && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] bg-[#120f0c]"
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 1.2, ease }}
          aria-label="Intro"
        >
          <div className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,162,74,0.2)_0%,rgba(218,90,26,0.07)_40%,transparent_70%)]" />
          <div className="absolute inset-0">
            <ParticleJourney progress={progress} active onReady={onReady} />
          </div>
          <motion.div
            style={{ opacity: flash }}
            className="pointer-events-none absolute inset-0 bg-gold-soft mix-blend-overlay"
          />

          {captions.map((caption, index) => (
            <Caption key={caption.text} progress={progress} {...caption} text={t.intro.captions[index]} />
          ))}

          <div className="absolute inset-x-0 top-0 h-[2px] bg-cream/5">
            <motion.div style={{ scaleX: bar }} className="h-full origin-left bg-gold" />
          </div>

          <button
            type="button"
            onClick={leave}
            className="absolute bottom-6 right-6 rounded-full border border-cream/15 bg-ink/40 px-5 py-2.5 text-xs font-medium tracking-wide text-cream/80 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-gold/60 hover:text-gold-soft active:scale-[0.97] md:bottom-8 md:right-8"
          >
            {t.intro.skip}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
