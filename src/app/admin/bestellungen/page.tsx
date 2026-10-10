import { Suspense } from "react";
import { connection } from "next/server";
import { listDrivers, requireOwner, type User } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { LIMITS, listBlocks, type Block } from "@/lib/server/order-guard";
import { getOrderSettings, listActiveOrders, type Order } from "@/lib/server/orders";
import { OPEN_STATUSES, type OrderStatus } from "@/lib/ordering";
import AdminHeader from "../AdminHeader";
import { blockGuest, unblock, updateOrder } from "../order-actions";
import LiveRefresh from "@/components/LiveRefresh";
import { AddBlockForm, SettingsForm } from "./OrderClient";

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const time = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

const STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  new: { label: "Neu", tone: "border-gold bg-gold text-ink" },
  accepted: { label: "In der Küche", tone: "border-gold/60 text-gold-soft" },
  cooked: { label: "Essen fertig", tone: "border-gold/60 text-gold-soft" },
  packed: { label: "Verpackt", tone: "border-[#7fcf9c] bg-[#7fcf9c] text-ink" },
  ready: { label: "Abholbereit", tone: "border-[#7fcf9c]/60 text-[#9fe0b6]" },
  on_the_way: { label: "Unterwegs", tone: "border-[#7fcf9c]/60 text-[#9fe0b6]" },
  completed: { label: "Erledigt", tone: "border-cream/30 text-cream/60" },
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

/** Warning labels so the team knows when to call back before cooking. */
function RiskLabels({ o }: { o: Order }) {
  const r = o.risk;
  if (!r) return null;
  const labels: { text: string; warn?: boolean }[] = [];
  if (r.blocked) labels.push({ text: "Gesperrt", warn: true });
  if (r.rejectedBefore > 0) labels.push({ text: `Schon ${r.rejectedBefore}× abgelehnt/storniert`, warn: true });
  labels.push({ text: r.completedBefore === 0 ? "Erste Bestellung" : `${r.completedBefore}× bestellt` });
  if (o.total >= 100) labels.push({ text: "Große Bestellung" });
  if (o.hasAccount) labels.push({ text: "Mit Konto" });
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {labels.map((l) => (
        <span
          key={l.text}
          className={`rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold ${l.warn ? "border-[#f0a080]/70 text-[#f0a080]" : "border-cream/25 text-cream/70"}`}
        >
          {l.text}
        </span>
      ))}
    </div>
  );
}

/** Rejects or cancels the order (if still open) and blocks the guest's phone, email and device. */
function BlockForm({ o }: { o: Order }) {
  if (o.status === "completed" || o.risk?.blocked) return null;
  const label = o.status === "new" ? "Ablehnen & sperren" : OPEN_STATUSES.includes(o.status) ? "Stornieren & sperren" : "Gast sperren";
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-cream/55 hover:text-[#f0a080]">Scherzbestellung? Gast sperren</summary>
      <form action={blockGuest} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={o.id} />
        <input type="hidden" name="current" value={o.status} />
        <input
          name="note"
          maxLength={300}
          placeholder="Grund (nur intern sichtbar)"
          aria-label="Grund für die Sperre"
          className="w-full border-0 border-b border-[#f0a080]/40 bg-transparent px-0 pb-2 text-sm text-cream placeholder:text-cream/40 focus:border-[#f0a080] focus:outline-none"
        />
        <p className="text-xs text-cream/55">Sperrt Telefonnummer, E-Mail und Gerät für Online-Bestellungen (ein Jahr, jederzeit aufhebbar).</p>
        <button className="rounded-full border border-[#f0a080]/70 px-5 py-2 text-sm font-semibold text-[#f0a080] hover:bg-[#f0a080] hover:text-ink">
          {label}
        </button>
      </form>
    </details>
  );
}

const BLOCK_KIND: Record<Block["kind"], string> = { phone: "Telefon", email: "E-Mail", client: "Gerät" };

function BlockList({ blocks }: { blocks: Block[] }) {
  return (
    <section className="mt-10 border border-gold/20 bg-ink/40 p-6 md:p-8">
      <h2 className="font-display text-2xl font-semibold text-gold-soft">Gesperrte Gäste</h2>
      <p className="mb-6 mt-2 text-sm text-cream/65">
        Gesperrte Telefonnummern, E-Mail-Adressen und Geräte können nicht online bestellen und werden gebeten anzurufen. Automatisch gilt
        außerdem: höchstens {LIMITS.perPhonePerHour} Bestellungen pro Telefonnummer und {LIMITS.perDevicePerHour} pro Gerät in der Stunde,
        höchstens {LIMITS.maxUnconfirmed} unbestätigte Bestellungen gleichzeitig, und Erstbestellungen über {euro(LIMITS.largeFirstOrder)} nur
        telefonisch.
      </p>
      {blocks.length === 0 ? (
        <p className="text-cream/60">Niemand gesperrt.</p>
      ) : (
        <ul className="divide-y divide-gold/10 border-y border-gold/10">
          {blocks.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span className="text-cream">
                <span className="mr-2 text-xs uppercase tracking-[0.2em] text-gold">{BLOCK_KIND[b.kind]}</span>
                {b.label}
                {b.reason && <span className="text-cream/55"> · {b.reason}</span>}
                <span className="text-cream/40"> · seit {new Date(b.createdAt).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}</span>
              </span>
              <form action={unblock}>
                <input type="hidden" name="id" value={b.id} />
                <button className="rounded-full border border-cream/30 px-4 py-1.5 text-xs font-semibold text-cream hover:border-gold">Entsperren</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <AddBlockForm />
    </section>
  );
}

/** Hidden fields every step form sends: which order, and the status the button was shown for. */
function Step({ o }: { o: Order }) {
  return (
    <>
      <input type="hidden" name="id" value={o.id} />
      <input type="hidden" name="from" value={o.status} />
    </>
  );
}

/** Where an order stands in the kitchen and on the road, with the time of each step. */
function Progress({ o }: { o: Order }) {
  const steps: [string, string | null][] = [
    ["Essen fertig", o.cookedAt],
    ["Verpackt", o.packedAt],
    [o.method === "delivery" ? "Unterwegs" : "Abholbereit", o.outAt],
    [o.method === "delivery" ? "Zugestellt" : "Abgeholt", o.completedAt],
  ];
  if (o.status === "new" || o.status === "rejected") return null;
  return (
    <p className="mt-2 text-xs text-cream/55">
      {steps.map(([label, at]) => (at ? `${label} ${time(at)}` : null)).filter(Boolean).join(" · ") || "Küche bereitet zu"}
      {o.driverName && <span className="text-cream/75"> · Fahrer: {o.driverName}</span>}
    </p>
  );
}

function OrderCard({ o, drivers }: { o: Order; drivers: User[] }) {
  const s = STATUS[o.status];
  const delivery = o.method === "delivery";
  return (
    <li className={`border p-5 md:p-6 ${o.status === "new" || o.status === "packed" ? "border-gold bg-gold/[0.06]" : "border-gold/25 bg-ink/60"}`}>
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
      <Progress o={o} />
      <RiskLabels o={o} />
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
        {o.deposit > 0 && (
          <li className="flex justify-between text-cream/60">
            <span>Pfand</span>
            <span className="tabular-nums">{euro(o.deposit)}</span>
          </li>
        )}
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
          <Step o={o} />
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
      {OPEN_STATUSES.includes(o.status) && o.status !== "new" && (
        <form action={updateOrder} className="mt-5 space-y-3">
          <Step o={o} />
          {o.status === "packed" && delivery && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs uppercase tracking-[0.2em] text-gold" htmlFor={`driver-${o.id}`}>
                Fahrer
              </label>
              <select id={`driver-${o.id}`} name="driver" defaultValue={drivers[0]?.id ?? ""} className="border-0 border-b border-gold/30 bg-transparent text-cream [color-scheme:dark] focus:outline-none">
                {drivers.map((d) => (
                  <option key={d.id} value={d.id} className="bg-coal">
                    {d.name}
                  </option>
                ))}
                <option value="" className="bg-coal">
                  Ohne Fahrer-Konto
                </option>
              </select>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {o.status === "packed" &&
              (delivery ? (
                <Button status="on_the_way" primary>
                  Zur Lieferung übergeben
                </Button>
              ) : (
                <Button status="ready" primary>
                  Abholbereit
                </Button>
              ))}
            {(o.status === "ready" || o.status === "on_the_way") && (
              <Button status="completed" primary>
                {delivery ? "Zugestellt" : "Abgeholt"}
              </Button>
            )}
            {/* Kitchen steps, in case nobody from the kitchen is signed in */}
            {o.status === "accepted" && <Button status="cooked">Essen fertig</Button>}
            {o.status === "cooked" && <Button status="packed">Verpackt</Button>}
            <Button status="cancelled">Stornieren</Button>
          </div>
        </form>
      )}
      <BlockForm o={o} />
    </li>
  );
}

async function Board() {
  await connection();
  await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const [orders, settings, blocks, drivers] = await Promise.all([listActiveOrders(), getOrderSettings(), listBlocks(), listDrivers()]);
  const open = orders.filter((o) => OPEN_STATUSES.includes(o.status));
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
          <span className="font-display text-3xl text-gold-soft">{orders.filter((o) => o.status === "packed").length}</span> bereit zur Übergabe
        </p>
        <p>
          <span className="font-display text-3xl text-gold-soft">{euro(revenue)}</span> heute abgeschlossen
        </p>
        {settings.paused && <p className="self-end font-semibold text-[#f0a080]">Online-Bestellungen sind pausiert.</p>}
        {settings.ignoreHours && <p className="self-end font-semibold text-[#f0a080]">Bestellungen auch außerhalb der Öffnungszeiten an (vorübergehend).</p>}
      </div>

      <p className="mt-4 text-sm text-cream/60">
        Tipp: Bei <span className="text-cream/85">Erste Bestellung</span> oder roten Hinweisen kurz zurückrufen, bevor ihr kocht.
        Angenommene Bestellungen erscheinen in der <a href="/kueche" className="text-cream/85 underline underline-offset-4">Küche</a>; verpackte
        übergebt ihr hier an einen Fahrer{drivers.length === 0 && " (Fahrer-Konten legt ihr unter Team an)"}.
      </p>

      {open.length === 0 && <p className="mt-12 font-display text-2xl italic text-cream/70">Gerade keine offenen Bestellungen.</p>}
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {open.map((o) => (
          <OrderCard key={o.id} o={o} drivers={drivers} />
        ))}
      </ul>

      {done.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold text-gold-soft">Heute erledigt</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {done.map((o) => (
              <OrderCard key={o.id} o={o} drivers={drivers} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 border border-gold/20 bg-ink/40 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">Einstellungen für Bestellungen</h2>
        <p className="mb-6 mt-2 text-sm text-cream/65">Bestellungen sind während der Öffnungszeiten bis 30 Minuten vor Schluss möglich und an Schließtagen gesperrt.</p>
        <SettingsForm settings={settings} />
      </section>

      <BlockList blocks={blocks} />
    </>
  );
}

export default function AdminOrdersPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="orders" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Bestellungen …</p>}>
        <Board />
      </Suspense>
    </main>
  );
}
