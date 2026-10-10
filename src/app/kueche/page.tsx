import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import LiveRefresh from "@/components/LiveRefresh";
import LiveAlerts from "@/components/admin/LiveAlerts";
import StaffHeader from "@/components/StaffHeader";
import { requireRole } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { listKitchenOrders, type Order } from "@/lib/server/orders";
import { kitchenStep } from "./actions";

export const metadata: Metadata = { title: "Küche | Yetenbi", robots: { index: false, follow: false } };

const time = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

/** The time the food should be done: accepted + the minutes the team promised, or the guest's chosen time. */
function dueBy(o: Order) {
  if (o.wanted !== "asap") return `${o.wanted} Uhr ${o.method === "delivery" ? "beim Gast" : "Abholung"}`;
  if (o.acceptedAt && o.etaMinutes) return `fertig bis ${time(new Date(new Date(o.acceptedAt).getTime() + o.etaMinutes * 60_000).toISOString())}`;
  return "so schnell wie möglich";
}

/** Only the food: no prices, no guest details. */
function Ticket({ o }: { o: Order }) {
  const next = o.status === "accepted" ? { status: "cooked", label: "Essen fertig" } : o.status === "cooked" ? { status: "packed", label: "Verpackt" } : null;
  return (
    <li className={`flex flex-col border p-5 ${o.status === "packed" ? "border-cream/15 opacity-60" : o.status === "cooked" ? "border-[#7fcf9c]/60 bg-[#7fcf9c]/[0.05]" : "border-gold bg-gold/[0.05]"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-3xl text-cream">{o.reference}</p>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{o.method === "delivery" ? "Lieferung" : "Abholung"}</span>
      </div>
      <p className="mt-1 text-sm text-cream/65">
        Eingang {time(o.createdAt)} · {dueBy(o)}
      </p>
      <ul className="mt-4 space-y-2 border-t border-gold/15 pt-4">
        {o.items.map((l) => (
          <li key={l.id} className="flex gap-3 text-lg text-cream">
            <span className="w-10 shrink-0 font-display text-2xl leading-none text-gold-soft tabular-nums">{l.qty}×</span>
            <span>{l.name}</span>
          </li>
        ))}
      </ul>
      {o.note && <p className="mt-4 border-l-2 border-[#f0a080] pl-3 text-base text-cream">Hinweis vom Gast: {o.note}</p>}
      {next ? (
        <form action={kitchenStep} className="mt-auto pt-6">
          <input type="hidden" name="id" value={o.id} />
          <input type="hidden" name="from" value={o.status} />
          <button
            name="status"
            value={next.status}
            className={`w-full rounded-full py-4 text-lg font-semibold text-ink ${next.status === "cooked" ? "bg-gold" : "bg-[#7fcf9c]"}`}
          >
            {next.label}
          </button>
        </form>
      ) : (
        <p className="mt-auto pt-6 text-sm text-cream/60">Verpackt um {o.packedAt ? time(o.packedAt) : "–"} · wartet auf Übergabe</p>
      )}
    </li>
  );
}

function Column({ title, hint, orders }: { title: string; hint: string; orders: Order[] }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold text-gold-soft">
        {title} <span className="text-cream/50">({orders.length})</span>
      </h2>
      <p className="mt-1 text-sm text-cream/55">{hint}</p>
      {orders.length === 0 ? (
        <p className="mt-6 font-display text-xl italic text-cream/50">Nichts offen.</p>
      ) : (
        <ul className="mt-5 grid gap-4">
          {orders.map((o) => (
            <Ticket key={o.id} o={o} />
          ))}
        </ul>
      )}
    </section>
  );
}

async function Board() {
  await connection();
  const me = await requireRole(["kitchen", "owner"], "/kueche");
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const orders = await listKitchenOrders();
  return (
    <>
      <StaffHeader title="Küche" me={me} />
      <LiveRefresh seconds={15} />
      <LiveAlerts mode="kitchen" />
      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <Column title="Zubereiten" hint="Angenommene Bestellungen, älteste zuerst." orders={orders.filter((o) => o.status === "accepted")} />
        <Column title="Verpacken" hint="Essen ist fertig, jetzt einpacken." orders={orders.filter((o) => o.status === "cooked")} />
        <Column title="Verpackt" hint="Wartet auf Fahrer oder Abholung." orders={orders.filter((o) => o.status === "packed")} />
      </div>
    </>
  );
}

export default function KitchenPage() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-16">
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Küche …</p>}>
        <Board />
      </Suspense>
    </main>
  );
}
