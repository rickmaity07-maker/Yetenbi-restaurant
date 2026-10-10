import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import ColumnChart from "@/components/admin/ColumnChart";
import { PRESETS, parseRange, rangeQuery } from "@/lib/report-range";
import { requireOwner } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { getReport } from "@/lib/server/reports";
import AdminHeader from "../AdminHeader";

type Params = Promise<Record<string, string | string[] | undefined>>;

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %` : "–");
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "numeric", timeZone: "UTC" });
const longDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-gold/20 bg-ink/40 p-5">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-gold">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums text-cream md:text-4xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-cream/55">{sub}</p>}
    </div>
  );
}

/** Two shares of one whole as a split bar with both labels (identity never by colour alone). */
function Split({ title, a, b }: { title: string; a: { label: string; count: number; revenue: number }; b: { label: string; count: number; revenue: number } }) {
  const total = a.count + b.count;
  const share = total ? (a.count / total) * 100 : 50;
  return (
    <div>
      <p className="text-sm text-cream/75">{title}</p>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-cream/10" aria-hidden>
        {total > 0 && <span className="h-full bg-[#a8853a]" style={{ width: `${share}%` }} />}
        {total > 0 && <span className="ml-[2px] h-full flex-1 bg-cream/35" />}
      </div>
      <div className="mt-2 flex justify-between text-xs text-cream/70">
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#a8853a]" />
          {a.label}: {a.count} ({pct(a.count, total)}) · {euro(a.revenue)}
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-cream/35" />
          {b.label}: {b.count} ({pct(b.count, total)}) · {euro(b.revenue)}
        </span>
      </div>
    </div>
  );
}

async function ReportView({ searchParams }: { searchParams: Params }) {
  await connection();
  await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const range = parseRange(await searchParams);
  const r = await getReport(range);
  const get = <T extends { count: number; revenue: number }>(list: (T & Record<string, unknown>)[], key: string, value: string) =>
    list.find((x) => x[key] === value) ?? { count: 0, revenue: 0 };
  const maxDish = Math.max(1, ...r.topDishes.map((d) => d.qty));
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: r.perHour.find((x) => x.hour === h)?.orders ?? 0 })).filter(
    (h, _, all) => h.hour >= Math.min(11, ...all.filter((x) => x.orders).map((x) => x.hour)) && h.hour <= Math.max(22, ...all.filter((x) => x.orders).map((x) => x.hour)),
  );

  return (
    <>
      {/* period */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Zeitraum" className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Link
              key={p.key}
              href={`/admin/berichte?r=${p.key}`}
              className={`rounded-full px-4 py-1.5 text-sm ${range.preset === p.key ? "bg-gold font-semibold text-ink" : "border border-cream/20 text-cream/75 hover:border-gold"}`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap items-end gap-3 text-sm" action="/admin/berichte">
          <label className="flex flex-col gap-1 text-xs text-cream/60">
            Von
            <input type="date" name="von" defaultValue={range.from} className="border-b border-gold/30 bg-transparent text-cream [color-scheme:dark] focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-cream/60">
            Bis
            <input type="date" name="bis" defaultValue={range.to} className="border-b border-gold/30 bg-transparent text-cream [color-scheme:dark] focus:outline-none" />
          </label>
          <button className="rounded-full border border-cream/25 px-4 py-1.5 text-cream hover:border-gold">Anzeigen</button>
        </form>
      </div>
      <p className="mt-3 text-sm text-cream/55">
        {longDate(range.from)} bis {longDate(range.to)} · Umsatz = abgeschlossene Bestellungen, wie an der Tür bezahlt (inkl. Pfand und Liefergebühr)
      </p>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Umsatz" value={euro(r.orders.revenue)} sub={`davon Pfand ${euro(r.orders.deposit)}, Liefergebühren ${euro(r.orders.fees)}`} />
        <Kpi label="Bestellungen" value={String(r.orders.completed)} sub={`${r.orders.all} eingegangen`} />
        <Kpi label="Ø Bestellwert" value={euro(r.orders.average)} />
        <Kpi label="Abgelehnt / storniert" value={`${r.orders.rejected} / ${r.orders.cancelled}`} sub={`${pct(r.orders.rejected + r.orders.cancelled, r.orders.all)} aller Bestellungen`} />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">Umsatz pro Tag</h2>
        <ColumnChart
          title="Abgeschlossene Bestellungen, in Euro"
          unit="euro"
          data={r.perDay.map((d) => ({ key: d.day, label: dayLabel(d.day), value: d.revenue, detail: `${d.orders} Bestellungen` }))}
          labelEvery={Math.max(1, Math.ceil(r.perDay.length / 8))}
        />
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">Bestellungen nach Uhrzeit</h2>
          <ColumnChart
            title="Abgeschlossene Bestellungen nach Eingangsstunde"
            unit="count"
            data={hours.map((h) => ({ key: String(h.hour), label: `${h.hour} Uhr`, value: h.orders }))}
            labelEvery={3}
            height={150}
          />
        </section>
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-semibold text-gold-soft">Aufteilung</h2>
          <Split title="Lieferung oder Abholung" a={{ label: "Lieferung", ...get(r.byMethod, "method", "delivery") }} b={{ label: "Abholung", ...get(r.byMethod, "method", "pickup") }} />
          <Split title="Bar oder Karte" a={{ label: "Bar", ...get(r.byPayment, "payment", "cash") }} b={{ label: "Karte", ...get(r.byPayment, "payment", "card") }} />
        </section>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">Meistbestellt</h2>
          {r.topDishes.length === 0 ? (
            <p className="text-cream/55">Keine abgeschlossenen Bestellungen in diesem Zeitraum.</p>
          ) : (
            <ol className="space-y-2.5">
              {r.topDishes.map((d, i) => (
                <li key={d.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span className="text-right tabular-nums text-cream/45">{i + 1}</span>
                  <span>
                    <span className="flex justify-between gap-2 text-cream">
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="mt-1 block h-1.5 rounded-r-full bg-[#a8853a]" style={{ width: `${(d.qty / maxDish) * 100}%` }} aria-hidden />
                  </span>
                  <span className="text-right tabular-nums text-cream/75">
                    {d.qty}× · {euro(d.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">Reservierungen</h2>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Bestätigt" value={String(r.reservations.confirmed)} sub={`${r.reservations.guests} Gäste`} />
            <Kpi label="Abgelehnt / storniert" value={`${r.reservations.declined} / ${r.reservations.cancelled}`} />
            <Kpi label="Über die Website" value={String(r.reservations.website)} />
            <Kpi label="Telefonisch" value={String(r.reservations.phone)} />
          </div>
        </section>
      </div>

      <section className="mt-12 border border-gold/20 bg-ink/40 p-6">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">Export für die Buchhaltung</h2>
        <p className="mt-2 max-w-3xl text-sm text-cream/65">
          CSV-Dateien für Excel oder das Steuerbüro, ohne Namen und Kontaktdaten. Speisen und Getränke sind getrennt ausgewiesen (üblicherweise
          7 % bzw. 19 % MwSt. bei Lieferung und Abholung, bitte mit dem Steuerbüro abstimmen); Pfand und Liefergebühr stehen in eigenen
          Spalten. Maßgeblich für das Finanzamt bleibt die Kasse.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={`/api/admin/export?typ=bestellungen&${rangeQuery(range)}`} className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink">
            Bestellungen als CSV
          </a>
          <a href={`/api/admin/export?typ=reservierungen&${rangeQuery(range)}`} className="rounded-full border border-gold/60 px-5 py-2 text-sm font-semibold text-gold-soft hover:bg-gold hover:text-ink">
            Reservierungen als CSV
          </a>
        </div>
      </section>
    </>
  );
}

export default function ReportsPage({ searchParams }: { searchParams: Params }) {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="reports" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Bericht …</p>}>
        <ReportView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
