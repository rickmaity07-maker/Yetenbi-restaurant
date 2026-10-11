import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import LiveRefresh from "@/components/LiveRefresh";
import StaffHeader from "@/components/StaffHeader";
import { requireRole } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { listDriverOrders, type Order } from "@/lib/server/orders";
import { markDelivered } from "./actions";

export const metadata: Metadata = { title: "Lieferungen | Yetenbi", robots: { index: false, follow: false } };

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const mapsUrl = (o: Order) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.street}, ${o.postcode} ${o.city}`)}`;

function Delivery({ o, showDriver }: { o: Order; showDriver: boolean }) {
  const pieces = o.items.reduce((n, l) => n + l.qty, 0);
  return (
    <li className="border border-gold bg-gold/[0.05] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-3xl text-cream">{o.reference}</p>
        <span className="text-sm text-cream/60">los {o.outAt ? time(o.outAt) : "–"}</span>
      </div>
      <p className="mt-3 text-lg text-cream">
        <strong className="font-semibold">{o.name}</strong>
      </p>
      <a
        href={mapsUrl(o)}
        target="_blank"
        rel="noreferrer"
        className="mt-1 block text-lg text-cream underline decoration-gold/50 underline-offset-4"
      >
        {o.street}, {o.postcode} {o.city}
      </a>
      {o.addressNote && <p className="mt-1 text-cream/75">{o.addressNote}</p>}
      <a
        href={`tel:${o.phone}`}
        className="mt-3 inline-block rounded-full border border-cream/30 px-4 py-1.5 text-sm font-semibold text-cream"
      >
        Anrufen: {o.phone}
      </a>
      <p className="mt-4 border-t border-gold/15 pt-4 text-cream">
        {o.payment === "cash" ? "Bar kassieren" : "Kartenzahlung an der Tür"}:{" "}
        <span className="font-display text-2xl text-gold-soft">{euro(o.total)}</span>
      </p>
      <p className="mt-1 text-sm text-cream/60">
        {pieces} {pieces === 1 ? "Gericht" : "Gerichte"}: {o.items.map((l) => `${l.qty}× ${l.name}`).join(", ")}
      </p>
      {o.note && <p className="mt-2 border-l-2 border-gold/50 pl-3 text-sm text-cream/80">{o.note}</p>}
      {showDriver && <p className="mt-2 text-sm text-cream/60">Fahrer: {o.driverName ?? "ohne Konto"}</p>}
      <form action={markDelivered} className="mt-5">
        <input type="hidden" name="id" value={o.id} />
        <button className="w-full rounded-full bg-[#7fcf9c] py-4 text-lg font-semibold text-ink">Zugestellt</button>
      </form>
    </li>
  );
}

async function Board() {
  await connection();
  const me = await requireRole(["driver", "owner"], "/lieferung");
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const owner = me.role === "owner";
  const orders = await listDriverOrders(owner ? null : me.id);
  const open = orders.filter((o) => o.status === "on_the_way");
  const done = orders.filter((o) => o.status === "completed");
  const cash = done.filter((o) => o.payment === "cash").reduce((n, o) => n + o.total, 0);
  return (
    <>
      <StaffHeader title="Lieferungen" me={me} />
      <LiveRefresh seconds={20} />
      {open.length === 0 ? (
        <p className="mt-12 font-display text-2xl italic text-cream/70">
          Gerade keine Lieferungen{owner ? " unterwegs" : " für dich"}.
        </p>
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {open.map((o) => (
            <Delivery key={o.id} o={o} showDriver={owner} />
          ))}
        </ul>
      )}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">Heute zugestellt ({done.length})</h2>
        <p className="mt-1 text-sm text-cream/60">Bar kassiert: {euro(cash)}</p>
        {done.length > 0 && (
          <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10 text-sm">
            {done.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-3 py-3 text-cream/80">
                <span>
                  {o.reference} · {o.street}
                  {owner && o.driverName ? ` · ${o.driverName}` : ""}
                </span>
                <span className="tabular-nums">
                  {o.completedAt ? time(o.completedAt) : ""} · {euro(o.total)} {o.payment === "cash" ? "bar" : "Karte"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function DeliveryPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10 md:px-5 md:py-16">
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Lieferungen …</p>}>
        <Board />
      </Suspense>
    </main>
  );
}
