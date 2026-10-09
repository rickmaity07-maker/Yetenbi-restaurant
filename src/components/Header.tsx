"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { useState } from "react";
import Jebena from "./Jebena";
import Magnetic from "./motion/Magnetic";
import { useIntro } from "./intro/IntroState";

const links = [
  { href: "#platte", label: "Die Platte" },
  { href: "#speisekarte", label: "Speisekarte" },
  { href: "#kaffee", label: "Kaffee" },
  { href: "#besuch", label: "Anfahrt" },
];

const spring = [0.32, 0.72, 0, 1] as const;

export default function Header() {
  const { scrollY } = useScroll();
  const { done } = useIntro();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 500 && !open);
  });

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 md:pt-5"
        initial={{ y: -120, opacity: 0 }}
        animate={done ? { y: hidden ? -120 : 0, opacity: hidden ? 0 : 1 } : undefined}
        transition={{ duration: 0.8, ease: spring, delay: done && !hidden ? 0.9 : 0 }}
      >
        <nav
          aria-label="Hauptnavigation"
          className="flex w-full max-w-5xl items-center justify-between gap-6 rounded-full border border-cream/10 bg-ink/55 py-2 pl-5 pr-2 shadow-[inset_0_1px_0_rgba(244,236,220,0.08),0_20px_50px_-20px_rgba(10,6,2,0.8)] backdrop-blur-md lg:w-max lg:justify-start"
        >
          <a href="#top" className="group flex shrink-0 items-center gap-2.5 text-gold" onClick={() => setOpen(false)}>
            <Jebena className="h-7 w-5 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-rotate-12" />
            <span className="font-display text-xl font-bold tracking-[0.2em] text-gold-soft">YETENBI</span>
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="rounded-full px-4 py-2 text-[0.85rem] text-cream/80 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-cream/[0.06] hover:text-cream"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block">
            <Magnetic strength={0.2}>
              <a
                href="#reservieren"
                className="group flex items-center gap-3 rounded-full bg-gold py-1.5 pl-5 pr-1.5 text-sm font-medium text-ink transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
              >
                Tisch reservieren
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105">
                  <ArrowUpRight size={15} weight="bold" />
                </span>
              </a>
            </Magnetic>
          </div>

          <button
            type="button"
            className="relative h-10 w-10 shrink-0 rounded-full bg-cream/[0.06] lg:hidden"
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span
              className={`absolute left-3 right-3 h-px bg-cream transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                open ? "top-1/2 rotate-45" : "top-[15px]"
              }`}
            />
            <span
              className={`absolute left-3 right-3 h-px bg-cream transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                open ? "top-1/2 -rotate-45" : "top-[24px]"
              }`}
            />
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-end bg-ink/85 px-6 pb-12 pt-28 backdrop-blur-3xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: spring }}
          >
            <ul className="space-y-1">
              {links.map((l, i) => (
                <li key={l.href} className="overflow-hidden">
                  <motion.a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block py-2 font-display text-5xl text-cream"
                    initial={{ y: "100%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "100%" }}
                    transition={{ duration: 0.7, ease: spring, delay: 0.08 + i * 0.05 }}
                  >
                    {l.label}
                  </motion.a>
                </li>
              ))}
            </ul>
            <motion.a
              href="#reservieren"
              className="mt-10 flex items-center justify-between rounded-full bg-gold py-2 pl-6 pr-2 font-medium text-ink"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: spring, delay: 0.4 }}
            >
              Tisch reservieren
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/10">
                <ArrowUpRight size={18} weight="bold" />
              </span>
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
