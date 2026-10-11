"use client";

import { Minus, Plus } from "@phosphor-icons/react";

const roundButton =
  "flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-gold-soft hover:bg-gold hover:text-ink";

/** − 2 + buttons for the quantity of a dish. */
export function QuantityStepper({
  quantity,
  onChange,
  lessLabel,
  moreLabel,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
  lessLabel: string;
  moreLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={lessLabel} onClick={() => onChange(quantity - 1)} className={roundButton}>
        <Minus size={14} />
      </button>
      <span className="w-5 text-center font-display text-xl tabular-nums text-cream" aria-live="polite">
        {quantity}
      </span>
      <button type="button" aria-label={moreLabel} onClick={() => onChange(quantity + 1)} className={roundButton}>
        <Plus size={14} />
      </button>
    </div>
  );
}

/** A label above an input, with the error message below it. */
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-[#f0a080]">
          {error}
        </p>
      )}
    </div>
  );
}
