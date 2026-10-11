"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Check } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { formatEuro, type OrderStatus } from "@/lib/ordering";
import type { L } from "@/lib/data";
import { useLanguage } from "@/lib/language";

type Status = {
  reference: string;
  status: OrderStatus;
  method: "delivery" | "pickup";
  etaMinutes: number | null;
  updatedAt: string;
  staffNote: string;
  items: { id: string; name: string; qty: number; unit: number; names: L | null }[];
  subtotal: number;
  deposit?: number;
  deliveryFee: number;
  total: number;
  wanted: string;
};

/** Live order status: polls every 15 seconds until the order is finished. */
export default function StatusView() {
  const { t, locale } = useLanguage();
  const o = t.order;
  const params = useSearchParams();
  const r = params.get("r") ?? "";
  const tok = params.get("t") ?? "";
  const [data, setData] = useState<Status | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await fetch(`/api/order/status?r=${encodeURIComponent(r)}&t=${encodeURIComponent(tok)}`, {
          cache: "no-store",
        });
        if (res.status === 404) {
          setMissing(true);
          return;
        }
        const d = (await res.json()) as Status;
        if (stop) return;
        setData(d);
        if (!["completed", "rejected", "cancelled"].includes(d.status)) timer = setTimeout(load, 15000);
      } catch {
        timer = setTimeout(load, 20000);
      }
    };
    load();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [r, tok]);

  if (missing) return <p className="font-display text-2xl italic text-cream/80">{o.notFound}</p>;
  if (!data) return <div className="h-80" aria-busy />;

  const steps: OrderStatus[] = [
    "new",
    "accepted",
    "cooked",
    "packed",
    data.method === "delivery" ? "on_the_way" : "ready",
    "completed",
  ];
  const reached = steps.indexOf(data.status);
  const failed = data.status === "rejected" || data.status === "cancelled";
  const euro = (n: number) => formatEuro(n, t.dateLocale);

  const message = failed
    ? data.status === "rejected"
      ? o.rejectedText
      : o.cancelledText
    : data.status === "completed"
      ? o.doneText
      : data.status === "new"
        ? o.waiting
        : data.etaMinutes
          ? o.eta(data.etaMinutes, data.method === "delivery")
          : o.status[data.status];

  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">
        {o.reference} {data.reference}
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-cream md:text-5xl">{o.statusTitle}</h1>
      <p className="mt-4 font-display text-2xl italic text-cream/85" aria-live="polite">
        {message}
      </p>
      {data.staffNote && <p className="mt-3 border-l-2 border-gold/60 pl-4 text-cream/80">{data.staffNote}</p>}

      {!failed && (
        <ol className="mt-10 grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-6">
          {steps.map((step, i) => {
            const done = i <= reached;
            return (
              <li key={step} className="flex flex-col items-center gap-2 text-center">
                <motion.span
                  initial={false}
                  animate={{ scale: i === reached ? [1, 1.15, 1] : 1 }}
                  transition={{ duration: 1.6, repeat: i === reached && data.status !== "completed" ? Infinity : 0 }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${done ? "border-gold bg-gold text-ink" : "border-cream/25 text-cream/40"}`}
                >
                  {done ? <Check size={18} weight="bold" /> : i + 1}
                </motion.span>
                <span className={`text-xs ${done ? "text-cream" : "text-cream/45"}`}>{o.status[step]}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-10 border border-gold/25 bg-ink/40 p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold">
          {data.method === "delivery" ? o.delivery : o.pickup} ·{" "}
          {data.wanted === "asap" ? o.asap(0).split(" (")[0] : t.clock(data.wanted)}
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {data.items.map((l) => (
            <li key={l.id} className="flex justify-between gap-3">
              <span className="text-cream">
                {l.qty} × {l.names?.[locale] ?? l.name}
              </span>
              <span className="tabular-nums text-cream/80">{euro(l.qty * l.unit)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-gold/20 pt-4 text-sm">
          {(data.deposit ?? 0) > 0 && (
            <div className="flex justify-between text-cream/75">
              <dt>{o.deposit}</dt>
              <dd className="tabular-nums">{euro(data.deposit ?? 0)}</dd>
            </div>
          )}
          {data.deliveryFee > 0 && (
            <div className="flex justify-between text-cream/75">
              <dt>{o.deliveryFee}</dt>
              <dd className="tabular-nums">{euro(data.deliveryFee)}</dd>
            </div>
          )}
          <div className="flex justify-between font-display text-2xl text-gold-soft">
            <dt>{o.total}</dt>
            <dd className="tabular-nums">{euro(data.total)}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 text-sm text-cream/60">{o.keepPage}</p>
      <Link
        href="/bestellen"
        className="mt-6 inline-block text-sm font-semibold text-gold-soft underline decoration-gold/40 underline-offset-4"
      >
        {o.again}
      </Link>
    </div>
  );
}
