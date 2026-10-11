"use client";

import { createContext, useContext } from "react";
import { ADDITIVES, ALLERGENS, tagsOf, type Dish, type Menu } from "@/lib/menu";
import { formatEuro } from "@/lib/ordering";
import { useLanguage } from "@/lib/language";

/* The menu from the database for the menu card, and the food information shown with each dish. */

const MenuContext = createContext<Menu>([]);

export function MenuProvider({ menu, children }: { menu: Menu; children: React.ReactNode }) {
  return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>;
}

export const useMenu = () => useContext(MenuContext);

const litres = (v: number, dateLocale: string) =>
  `${v.toLocaleString(dateLocale === "am-ET" ? "de-DE" : dateLocale, { maximumFractionDigits: 2 })} l`;

/** "0,33 l · 7,58 €/l · zzgl. 0,25 € Pfand" for drinks; nothing when no volume or deposit was entered. */
export function DrinkFacts({ dish }: { dish: Dish }) {
  const { t } = useLanguage();
  const euro = (n: number) => formatEuro(n, t.dateLocale);
  const parts = [
    dish.volume ? litres(dish.volume, t.dateLocale) : null,
    dish.volume ? t.menu.perLitre(euro(dish.price / dish.volume)) : null,
    dish.deposit ? t.menu.plusDeposit(euro(dish.deposit)) : null,
  ].filter(Boolean);
  return parts.length ? <span className="text-sm text-cream/60">{parts.join(" · ")}</span> : null;
}

/** "Allergene: A, G · Zusatzstoffe: 1, 11" with the full names on hover and for screen readers. */
export function AllergenFacts({ dish, className = "" }: { dish: Dish; className?: string }) {
  const { t, locale } = useLanguage();
  if (!dish.allergens.length && !dish.additives.length) return null;
  const name = (code: string) => ALLERGENS.find((a) => a.code === code)?.label[locale] ?? code;
  const add = (code: number) => ADDITIVES.find((a) => a.code === code)?.label[locale] ?? String(code);
  return (
    <p className={`text-xs text-cream/55 ${className}`}>
      {dish.allergens.length > 0 && (
        <span title={dish.allergens.map(name).join(", ")}>
          {t.menu.allergens}: <span aria-hidden>{dish.allergens.join(", ")}</span>
          <span className="sr-only">{dish.allergens.map(name).join(", ")}</span>
        </span>
      )}
      {dish.allergens.length > 0 && dish.additives.length > 0 && " · "}
      {dish.additives.length > 0 && (
        <span title={dish.additives.map(add).join(", ")}>
          {t.menu.additives}: <span aria-hidden>{dish.additives.join(", ")}</span>
          <span className="sr-only">{dish.additives.map(add).join(", ")}</span>
        </span>
      )}
    </p>
  );
}

/** The dish's tags in the visitor's language, including the gluten wording. */
export function useTagLabels(dish: Dish) {
  const { t } = useLanguage();
  return tagsOf(dish).map((g) => t.tags[g]);
}

/** What the letters and numbers mean. */
export function FactsLegend({ className = "" }: { className?: string }) {
  const { t, locale } = useLanguage();
  return (
    <details className={`text-xs text-cream/60 ${className}`}>
      <summary className="cursor-pointer underline decoration-gold/40 underline-offset-4 hover:text-cream">
        {t.menu.legend}
      </summary>
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
