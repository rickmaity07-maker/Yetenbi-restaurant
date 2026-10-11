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

const euro = (amount: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %` : "–");
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "numeric", timeZone: "UTC" });
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

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
function Split({
  title,
  first,
  second,
}: {
  title: string;
  first: { label: string; count: number; revenue: number };
  second: { label: string; count: number; revenue: number };
}) {
  const total = first.count + second.count;
  const share = total ? (first.count / total) * 100 : 50;
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
          {first.label}: {first.count} ({percent(first.count, total)}) · {euro(first.revenue)}
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-cream/35" />
          {second.label}: {second.count} ({percent(second.count, total)}) · {euro(second.revenue)}
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
  const report = await getReport(range);

  /** The count and revenue of one group (e.g. method "delivery"), or zeros when there were none. */
  const groupOf = <T extends { count: number; revenue: number }>(
    groups: (T & Record<string, unknown>)[],
    key: string,
    value: string,
  ) => groups.find((group) => group[key] === value) ?? { count: 0, revenue: 0 };

  const mostOrdered = Math.max(1, ...report.topDishes.map((dish) => dish.qty));

  // Orders per hour, shown from 11 to 22 o'clock, widened if there were orders earlier or later.
  const allHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    orders: report.perHour.find((row) => row.hour === hour)?.orders ?? 0,
  }));
  const busyHours = allHours.filter((row) => row.orders > 0).map((row) => row.hour);
  const firstHour = Math.min(11, ...busyHours);
  const lastHour = Math.max(22, ...busyHours);
  const hours = allHours.filter((row) => row.hour >= firstHour && row.hour <= lastHour);

  return (
    <>
      {/* period */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Zeitraum" className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Link
              key={preset.key}
              href={`/admin/berichte?r=${preset.key}`}
              className={`rounded-full px-4 py-1.5 text-sm ${range.preset === preset.key ? "bg-gold font-semibold text-ink" : "border border-cream/20 text-cream/75 hover:border-gold"}`}
            >
              {preset.label}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap items-end gap-3 text-sm" action="/admin/berichte">
          <label className="flex flex-col gap-1 text-xs text-cream/60">
            Von
            <input
              type="date"
              name="von"
              defaultValue={range.from}
              className="border-b border-gold/30 bg-transparent text-cream [color-scheme:dark] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-cream/60">
            Bis
            <input
              type="date"
              name="bis"
              defaultValue={range.to}
              className="border-b border-gold/30 bg-transparent text-cream [color-scheme:dark] focus:outline-none"
            />
          </label>
          <button className="rounded-full border border-cream/25 px-4 py-1.5 text-cream hover:border-gold">
            Anzeigen
          </button>
        </form>
      </div>
      <p className="mt-3 text-sm text-cream/55">
        {longDate(range.from)} bis {longDate(range.to)} · Umsatz = abgeschlossene Bestellungen, wie an der Tür bezahlt
        (inkl. Pfand und Liefergebühr)
      </p>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Umsatz"
          value={euro(report.orders.revenue)}
          sub={`davon Pfand ${euro(report.orders.deposit)}, Liefergebühren ${euro(report.orders.fees)}`}
        />
        <Kpi label="Bestellungen" value={String(report.orders.completed)} sub={`${report.orders.all} eingegangen`} />
        <Kpi label="Ø Bestellwert" value={euro(report.orders.average)} />
        <Kpi
          label="Abgelehnt / storniert"
          value={`${report.orders.rejected} / ${report.orders.cancelled}`}
          sub={`${percent(report.orders.rejected + report.orders.cancelled, report.orders.all)} aller Bestellungen`}
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">Umsatz pro Tag</h2>
        <ColumnChart
          title="Abgeschlossene Bestellungen, in Euro"
          unit="euro"
          data={report.perDay.map((day) => ({
            key: day.day,
            label: dayLabel(day.day),
            value: day.revenue,
            detail: `${day.orders} Bestellungen`,
          }))}
          labelEvery={Math.max(1, Math.ceil(report.perDay.length / 8))}
        />
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">Bestellungen nach Uhrzeit</h2>
          <ColumnChart
            title="Abgeschlossene Bestellungen nach Eingangsstunde"
            unit="count"
            data={hours.map((row) => ({ key: String(row.hour), label: `${row.hour} Uhr`, value: row.orders }))}
            labelEvery={3}
            height={150}
          />
        </section>
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-semibold text-gold-soft">Aufteilung</h2>
          <Split
            title="Lieferung oder Abholung"
            first={{ label: "Lieferung", ...groupOf(report.byMethod, "method", "delivery") }}
            second={{ label: "Abholung", ...groupOf(report.byMethod, "method", "pickup") }}
          />
          <Split
            title="Bar oder Karte"
            first={{ label: "Bar", ...groupOf(report.byPayment, "payment", "cash") }}
            second={{ label: "Karte", ...groupOf(report.byPayment, "payment", "card") }}
          />
        </section>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">Meistbestellt</h2>
          {report.topDishes.length === 0 ? (
            <p className="text-cream/55">Keine abgeschlossenen Bestellungen in diesem Zeitraum.</p>
          ) : (
            <ol className="space-y-2.5">
              {report.topDishes.map((dish, index) => (
                <li key={dish.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span className="text-right tabular-nums text-cream/45">{index + 1}</span>
                  <span>
                    <span className="flex justify-between gap-2 text-cream">
                      <span className="truncate">{dish.name}</span>
                    </span>
                    <span
                      className="mt-1 block h-1.5 rounded-r-full bg-[#a8853a]"
                      style={{ width: `${(dish.qty / mostOrdered) * 100}%` }}
                      aria-hidden
                    />
                  </span>
                  <span className="text-right tabular-nums text-cream/75">
                    {dish.qty}× · {euro(dish.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">Reservierungen</h2>
          <div className="grid grid-cols-2 gap-3">
            <Kpi
              label="Bestätigt"
              value={String(report.reservations.confirmed)}
              sub={`${report.reservations.guests} Gäste`}
            />
            <Kpi
              label="Abgelehnt / storniert"
              value={`${report.reservations.declined} / ${report.reservations.cancelled}`}
            />
            <Kpi label="Über die Website" value={String(report.reservations.website)} />
            <Kpi label="Telefonisch" value={String(report.reservations.phone)} />
          </div>
        </section>
      </div>

      <section className="mt-12 border border-gold/20 bg-ink/40 p-6">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">Export für die Buchhaltung</h2>
        <p className="mt-2 max-w-3xl text-sm text-cream/65">
          CSV-Dateien für Excel oder das Steuerbüro, ohne Namen und Kontaktdaten. Speisen und Getränke sind getrennt
          ausgewiesen (üblicherweise 7 % bzw. 19 % MwSt. bei Lieferung und Abholung, bitte mit dem Steuerbüro
          abstimmen); Pfand und Liefergebühr stehen in eigenen Spalten. Maßgeblich für das Finanzamt bleibt die Kasse.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`/api/admin/export?typ=bestellungen&${rangeQuery(range)}`}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink"
          >
            Bestellungen als CSV
          </a>
          <a
            href={`/api/admin/export?typ=reservierungen&${rangeQuery(range)}`}
            className="rounded-full border border-gold/60 px-5 py-2 text-sm font-semibold text-gold-soft hover:bg-gold hover:text-ink"
          >
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
