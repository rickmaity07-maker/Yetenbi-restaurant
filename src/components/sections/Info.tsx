"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { useLanguage } from "@/lib/language";
import { ease, Heading, Rise } from "../ui/primitives";

/** Practical facts as large rows; each opens to a short explanation on hover or tap. */
export default function Info() {
  const [open, setOpen] = useState<number | null>(null);
  const { t, locale } = useLanguage();
  const facts = [...t.info.facts, { term: t.info.hoursTerm, value: t.info.hoursValue, detail: t.info.hoursDetail }];

  return (
    <section className="relative py-32 md:py-44 [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Heading key={locale} title={t.info.title} em={t.info.em} size="md" />

        <div className="mt-14 border-t border-gold/20">
          {facts.map((f, i) => {
            const isOpen = open === i;
            return (
              <Rise key={f.term} delay={i * 0.06}>
                <div
                  className="group border-b border-gold/20"
                  onMouseEnter={() => setOpen(i)}
                  onMouseLeave={() => setOpen(null)}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="grid w-full grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-7 text-left md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] md:py-9"
                  >
                    <span
                      className={`font-display text-[clamp(2rem,4.4vw,3.75rem)] font-semibold leading-none transition-colors duration-500 ${
                        isOpen ? "text-gold-soft" : "text-cream/45"
                      }`}
                    >
                      {f.term}
                    </span>
                    <span className="order-3 col-span-2 font-display text-xl italic text-cream/85 md:order-none md:col-span-1 md:text-2xl">
                      {f.value}
                    </span>
                    <span
                      aria-hidden
                      className={`flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-gold-soft transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isOpen ? "rotate-45 bg-gold text-ink" : ""
                      }`}
                    >
                      <Plus size={16} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease }}
                        className="overflow-hidden text-base leading-relaxed text-cream/72 md:ml-[calc(45%+0.75rem)] md:max-w-xl"
                      >
                        <span className="block pb-8">{f.detail}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </Rise>
            );
          })}
        </div>
      </div>
    </section>
  );
}
