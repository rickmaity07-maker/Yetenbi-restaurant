"use client";

import { Bag } from "@phosphor-icons/react";
import { useLanguage } from "@/lib/language";
import type { Dish } from "@/lib/menu";
import type { CartLine, Method } from "@/lib/ordering";

type Prices = { subtotal: number; deposit: number; fee: number; total: number };

function PriceRow({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex justify-between text-cream/75">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** The basket with its lines, subtotal, deposit, delivery fee and total. */
export default function Basket({
  cart,
  itemCount,
  findDish,
  method,
  prices,
  formatPrice,
  error,
}: {
  cart: CartLine[];
  itemCount: number;
  findDish: (id: string) => Dish | undefined;
  method: Method;
  prices: Prices;
  formatPrice: (amount: number) => string;
  error?: string;
}) {
  const { t, locale } = useLanguage();
  const text = t.order;

  return (
    <div className="border border-gold/25 bg-ink/40 p-5">
      <p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold">
        <Bag size={16} /> {text.cart} {itemCount > 0 && `(${itemCount})`}
      </p>

      {cart.length === 0 ? (
        <p className="mt-4 font-display text-lg italic text-cream/60">{text.empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {cart.map((line) => {
            const dish = findDish(line.id);
            if (!dish) return null;
            return (
              <li key={line.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-cream">
                  {line.qty} × {dish.name[locale]}
                </span>
                <span className="tabular-nums text-cream/80">{formatPrice(dish.price * line.qty)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <dl className="mt-4 space-y-1 border-t border-gold/20 pt-4 text-sm">
        <PriceRow label={text.subtotal} value={formatPrice(prices.subtotal)} />
        {prices.deposit > 0 && <PriceRow label={text.deposit} value={formatPrice(prices.deposit)} />}
        {method === "delivery" && (
          <PriceRow label={text.deliveryFee} value={prices.fee ? formatPrice(prices.fee) : text.free} />
        )}
        <div className="flex justify-between pt-1 font-display text-2xl text-gold-soft">
          <dt>
            {text.total} <span className="font-sans text-xs text-cream/55">{text.vat}</span>
          </dt>
          <dd className="tabular-nums">{formatPrice(prices.total)}</dd>
        </div>
      </dl>

      {error && <p className="mt-3 text-sm text-[#f0a080]">{error}</p>}
    </div>
  );
}
