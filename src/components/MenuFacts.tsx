"use client";

import { createContext, useContext } from "react";
import { ADDITIVES, ALLERGENS, infoOf, tagsFor, type MenuInfo } from "@/lib/menu-info";
import type { MenuItem } from "@/lib/data";
import { formatEuro } from "@/lib/ordering";
import { useLanguage } from "@/lib/language";

/* Food information from /admin → Speisekarte on the menu card and the order page. */

const MenuInfoContext = createContext<MenuInfo>({});

export function MenuInfoProvider({ info, children }: { info: MenuInfo; children: React.ReactNode }) {
  return <MenuInfoContext.Provider value={info}>{children}</MenuInfoContext.Provider>;
}

export const useMenuInfo = () => useContext(MenuInfoContext);

const litres = (v: number, dateLocale: string) => `${v.toLocaleString(dateLocale === "am-ET" ? "de-DE" : dateLocale, { maximumFractionDigits: 2 })} l`;

/** "0,33 l · 7,58 €/l · zzgl. 0,25 € Pfand" for drinks; empty when nothing was entered. */
export function DrinkFacts({ id, price }: { id: string; price: number }) {
  const { t } = useLanguage();
  const i = infoOf(useMenuInfo(), id);
  const euro = (n: number) => formatEuro(n, t.dateLocale);
  const parts = [
    i.volume ? litres(i.volume, t.dateLocale) : null,
    i.volume ? t.menu.perLitre(euro(price / i.volume)) : null,
    i.deposit ? t.menu.plusDeposit(euro(i.deposit)) : null,
  ].filter(Boolean);
  return parts.length ? <span className="text-sm text-cream/60">{parts.join(" · ")}</span> : null;
}

/** "Allergene: A, G · Zusatzstoffe: 1, 11" with the full names on hover and for screen readers. */
export function AllergenFacts({ id, className = "" }: { id: string; className?: string }) {
  const { t, locale } = useLanguage();
  const i = infoOf(useMenuInfo(), id);
  if (!i.allergens.length && !i.additives.length) return null;
  const name = (code: string) => ALLERGENS.find((a) => a.code === code)?.label[locale] ?? code;
  const add = (code: number) => ADDITIVES.find((a) => a.code === code)?.label[locale] ?? String(code);
  return (
    <p className={`text-xs text-cream/55 ${className}`}>
      {i.allergens.length > 0 && (
        <span title={i.allergens.map(name).join(", ")}>
          {t.menu.allergens}: <span aria-hidden>{i.allergens.join(", ")}</span>
          <span className="sr-only">{i.allergens.map(name).join(", ")}</span>
        </span>
      )}
      {i.allergens.length > 0 && i.additives.length > 0 && " · "}
      {i.additives.length > 0 && (
        <span title={i.additives.map(add).join(", ")}>
          {t.menu.additives}: <span aria-hidden>{i.additives.join(", ")}</span>
          <span className="sr-only">{i.additives.map(add).join(", ")}</span>
        </span>
      )}
    </p>
  );
}

/** Tags with the gluten wording the owner chose. */
export function useTags(item: Pick<MenuItem, "tags">, id: string) {
  const { t } = useLanguage();
  return tagsFor(item, infoOf(useMenuInfo(), id)).map((g) => t.tags[g]);
}

/** What the letters and numbers mean. */
export function FactsLegend({ className = "" }: { className?: string }) {
  const { t, locale } = useLanguage();
  return (
    <details className={`text-xs text-cream/60 ${className}`}>
      <summary className="cursor-pointer underline decoration-gold/40 underline-offset-4 hover:text-cream">{t.menu.legend}</summary>
      <div className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
        <ul className="space-y-0.5">
          {ALLERGENS.map((a) => (
            <li key={a.code}>
              <span className="mr-2 font-semibold text-gold-soft">{a.code}</span>
              {a.label[locale]}
            </li>
          ))}
        </ul>
        <ul className="space-y-0.5">
          {ADDITIVES.map((a) => (
            <li key={a.code}>
              <span className="mr-2 font-semibold text-gold-soft">{a.code}</span>
              {a.label[locale]}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
