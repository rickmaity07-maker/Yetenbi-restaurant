import { Suspense } from "react";
import { connection } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { getOrderSettings, listActiveOrders, type Order } from "@/lib/server/orders";
import type { OrderStatus } from "@/lib/ordering";
import AdminHeader from "../AdminHeader";
import { updateOrder } from "../order-actions";
import { LiveRefresh, SettingsForm } from "./OrderClient";

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const time = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

const STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  new: { label: "Neu", tone: "border-gold bg-gold text-ink" },
  accepted: { label: "Angenommen", tone: "border-gold/60 text-gold-soft" },
  ready: { label: "Abholbereit", tone: "border-[#7fcf9c]/60 text-[#9fe0b6]" },
  on_the_way: { label: "Unterwegs", tone: "border-[#7fcf9c]/60 text-[#9fe0b6]" },
  completed: { label: "Abgeschlossen", tone: "border-cream/30 text-cream/60" },
  rejected: { label: "Abgelehnt", tone: "border-[#f0a080]/60 text-[#f0a080]" },
  cancelled: { label: "Storniert", tone: "border-cream/30 text-cream/60" },
};

function Button({ status, children, primary }: { status: OrderStatus; children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      name="status"
      value={status}
      className={primary ? "rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink" : "rounded-full border border-cream/30 px-5 py-2 text-sm font-semibold text-cream hover:border-gold"}
    >
      {children}
    </button>
  );
}

function OrderCard({ o }: { o: Order }) {
  const s = STATUS[o.status];
  const delivery = o.method === "delivery";
  return (
    <li className={`border p-5 md:p-6 ${o.status === "new" ? "border-gold bg-gold/[0.06]" : "border-gold/25 bg-ink/60"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-display text-2xl text-cream">
          {o.reference} · {delivery ? "Lieferung" : "Abholung"}
        </p>
        <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
      </div>
      <p className="mt-1 text-sm text-cream/65">
        Eingang {time(o.createdAt)} · {o.wanted === "asap" ? "so schnell wie möglich" : `gewünscht ${o.wanted} Uhr`} · {o.payment === "cash" ? "bar" : "Karte"}
        {o.etaMinutes && o.status !== "new" ? ` · ca. ${o.etaMinutes} Min.` : ""}
      </p>
      <p className="mt-3 text-cream">
        <strong className="font-semibold">{o.name}</strong> ·{" "}
        <a href={`tel:${o.phone}`} className="underline decoration-gold/40 underline-offset-4">
          {o.phone}
        </a>
      </p>
      {delivery && (
        <p className="text-cream/85">
          {o.street}, {o.postcode} {o.city}
          {o.addressNote && <span className="text-cream/60"> · {o.addressNote}</span>}
        </p>
      )}
      <ul className="mt-4 space-y-1 border-t border-gold/15 pt-3 text-sm">
        {o.items.map((l) => (
          <li key={l.id} className="flex justify-between gap-3">
            <span className="text-cream">
              {l.qty} × {l.name}
            </span>
            <span className="tabular-nums text-cream/70">{euro(l.qty * l.unit)}</span>
          </li>
        ))}
        {o.deliveryFee > 0 && (
          <li className="flex justify-between text-cream/60">
            <span>Liefergebühr</span>
            <span className="tabular-nums">{euro(o.deliveryFee)}</span>
          </li>
        )}
        <li className="flex justify-between pt-1 font-display text-xl text-gold-soft">
          <span>Summe</span>
          <span className="tabular-nums">{euro(o.total)}</span>
        </li>
      </ul>
      {o.note && <p className="mt-3 border-l-2 border-gold/50 pl-3 text-sm italic text-cream/80">{o.note}</p>}

      {o.status === "new" && (
        <form action={updateOrder} className="mt-5 space-y-3">
          <input type="hidden" name="id" value={o.id} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs uppercase tracking-[0.2em] text-gold" htmlFor={`eta-${o.id}`}>
              Fertig in
            </label>
            <select id={`eta-${o.id}`} name="eta" defaultValue={delivery ? "45" : "20"} className="border-0 border-b border-gold/30 bg-transparent text-cream [color-scheme:dark] focus:outline-none">
              {[15, 20, 30, 45, 60, 75, 90].map((m) => (
                <option key={m} value={m} className="bg-coal">
                  {m} Min.
                </option>
              ))}
            </select>
          </div>
          <input
            name="note"
            maxLength={300}
            placeholder="Optionale Nachricht an den Gast"
            aria-label="Optionale Nachricht an den Gast"
            className="w-full border-0 border-b border-gold/30 bg-transparent px-0 pb-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <Button status="accepted" primary>
              Annehmen
            </Button>
            <Button status="rejected">Ablehnen</Button>
          </div>
        </form>
      )}
      {(o.status === "accepted" || o.status === "ready" || o.status === "on_the_way") && (
        <form action={updateOrder} className="mt-5 flex flex-wrap gap-3">
          <input type="hidden" name="id" value={o.id} />
          <input type="hidden" name="note" value={o.staffNote} />
          {o.status === "accepted" &&
            (delivery ? (
              <Button status="on_the_way" primary>
                Unterwegs
              </Button>
            ) : (
              <Button status="ready" primary>
                Abholbereit
              </Button>
            ))}
          <Button status="completed" primary={o.status !== "accepted"}>
            Abgeschlossen
          </Button>
          <Button status="cancelled">Stornieren</Button>
        </form>
      )}
    </li>
  );
}

async function Board() {
  await connection();
  await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const [orders, settings] = await Promise.all([listActiveOrders(), getOrderSettings()]);
  const open = orders.filter((o) => ["new", "accepted", "ready", "on_the_way"].includes(o.status));
  const done = orders.filter((o) => !open.includes(o));
  const revenue = orders.filter((o) => o.status === "completed").reduce((n, o) => n + o.total, 0);

  return (
    <>
      <LiveRefresh />
      <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-sm text-cream/75">
        <p>
          <span className="font-display text-3xl text-gold-soft">{orders.filter((o) => o.status === "new").length}</span> neu
        </p>
        <p>
          <span className="font-display text-3xl text-gold-soft">{open.length}</span> in Arbeit
        </p>
        <p>
          <span className="font-display text-3xl text-gold-soft">{euro(revenue)}</span> heute abgeschlossen
        </p>
        {settings.paused && <p className="self-end font-semibold text-[#f0a080]">Online-Bestellungen sind pausiert.</p>}
      </div>

      {open.length === 0 && <p className="mt-12 font-display text-2xl italic text-cream/70">Gerade keine offenen Bestellungen.</p>}
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {open.map((o) => (
          <OrderCard key={o.id} o={o} />
        ))}
      </ul>

      {done.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold text-gold-soft">Heute erledigt</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {done.map((o) => (
              <OrderCard key={o.id} o={o} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 border border-gold/20 bg-ink/40 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">Einstellungen für Bestellungen</h2>
        <p className="mb-6 mt-2 text-sm text-cream/65">Bestellungen sind während der Öffnungszeiten bis 30 Minuten vor Schluss möglich und an Schließtagen gesperrt.</p>
        <SettingsForm settings={settings} />
      </section>
    </>
  );
}

export default function AdminOrdersPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-16 md:py-24">
      <AdminHeader active="orders" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Bestellungen …</p>}>
        <Board />
      </Suspense>
    </main>
  );
}
