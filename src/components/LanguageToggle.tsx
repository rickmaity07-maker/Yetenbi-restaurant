"use client";

import { motion } from "motion/react";
import { content, LOCALES } from "@/lib/i18n";
import { setLocale, useLanguage } from "@/lib/language";

/** DE · EN · አማ switch; the active language sits on a sliding gold pill. */
export default function LanguageToggle({
  className = "",
  layoutId = "lang-pill",
}: {
  className?: string;
  layoutId?: string;
}) {
  const { locale, t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t.nav.language}
      className={`flex items-center rounded-full border border-cream/15 p-0.5 ${className}`}
    >
      {LOCALES.map((l) => {
        const on = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={on}
            title={content[l].langName}
            onClick={() => setLocale(l)}
            className={`relative rounded-full px-2.5 py-1 text-[0.72rem] font-semibold transition-colors duration-300 ${
              on ? "text-ink" : "text-cream/70 hover:text-cream"
            } ${l === "am" ? "font-ethiopic" : "tracking-wider"}`}
          >
            {on && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-gold"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{content[l].langShort}</span>
          </button>
        );
      })}
    </div>
  );
}
