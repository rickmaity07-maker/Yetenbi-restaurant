"use client";

import { useState } from "react";
import { AllergenFacts, DrinkFacts, FactsLegend } from "@/components/MenuFacts";
import { useLanguage } from "@/lib/language";
import { hasAllergenData, type Dish, type Menu } from "@/lib/menu";
import { QuantityStepper } from "./FormParts";

/** The orderable menu: category tabs, then each dish with an "Add" button or a quantity stepper. */
export default function MenuPicker({
  menu,
  isOrderable,
  quantityOf,
  setQuantity,
  formatPrice,
}: {
  menu: Menu;
  isOrderable: (id: string) => boolean;
  quantityOf: (id: string) => number;
  setQuantity: (id: string, quantity: number) => void;
  formatPrice: (amount: number) => string;
}) {
  const { t, locale } = useLanguage();
  const [selectedId, setSelectedId] = useState("");

  // Only what can be ordered right now; categories with nothing left are hidden.
  const categories = menu
    .map((category) => ({ ...category, items: category.items.filter((dish) => isOrderable(dish.id)) }))
    .filter((category) => category.items.length > 0);
  const selected = categories.find((category) => category.id === selectedId) ?? categories[0];

  function renderDish(dish: Dish) {
    const quantity = quantityOf(dish.id);
    return (
      <li key={dish.id} className="flex items-start justify-between gap-6 py-5">
        <div className="min-w-0">
          <p className="font-display text-xl text-cream md:text-2xl">{dish.name[locale]}</p>
          {dish.amharic && (
            <p lang="am" className="font-ethiopic text-[13px] text-gold/65">
              {dish.amharic}
            </p>
          )}
          {dish.description && (
            <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-cream/60">{dish.description[locale]}</p>
          )}
          <AllergenFacts dish={dish} className="mt-1" />
          <p className="mt-2 font-display text-lg text-gold-soft">
            {formatPrice(dish.price)} {selected?.drinks && <DrinkFacts dish={dish} />}
          </p>
        </div>
        <div className="shrink-0 pt-1">
          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => setQuantity(dish.id, 1)}
              className="rounded-full border border-gold/60 px-4 py-2 text-sm font-semibold text-gold-soft transition-colors hover:bg-gold hover:text-ink"
            >
              {t.order.add}
            </button>
          ) : (
            <QuantityStepper
              quantity={quantity}
              onChange={(next) => setQuantity(dish.id, next)}
              lessLabel={t.order.less}
              moreLabel={t.order.more}
            />
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="lg:col-span-7">
      <div
        role="tablist"
        aria-label={t.menu.categories}
        className="-mx-1 flex flex-wrap gap-x-6 gap-y-3 border-b border-gold/20 pb-3"
      >
        {categories.map((category) => {
          const isSelected = selected?.id === category.id;
          return (
            <button
              key={category.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedId(category.id)}
              className={`px-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] ${isSelected ? "text-gold-soft" : "text-cream/50 hover:text-cream/80"}`}
            >
              {category.title[locale]}
            </button>
          );
        })}
      </div>
      {selected?.id === "kaffee" && <p className="mt-5 text-sm italic text-cream/65">{t.order.ceremony}</p>}
      <ul className="mt-6 divide-y divide-cream/10">{selected?.items.map(renderDish)}</ul>
      {hasAllergenData(menu) && <FactsLegend className="mt-6" />}
    </div>
  );
}
