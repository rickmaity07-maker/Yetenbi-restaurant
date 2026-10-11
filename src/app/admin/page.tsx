import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import ColumnChart from "@/components/admin/ColumnChart";
import LiveRefresh from "@/components/LiveRefresh";
import { hasAllergenData } from "@/lib/menu";
import { requireOwner } from "@/lib/server/auth";
import { isCloudinaryConfigured } from "@/lib/server/cloudinary";
import { getDashboard } from "@/lib/server/dashboard";
import { hasDatabase } from "@/lib/server/db";
import { isMailerConfigured } from "@/lib/server/email";
import { readMenu } from "@/lib/server/menu";
import { readBusiness } from "@/lib/server/business";
import { impressumMissing } from "@/lib/business";
import { getOrderSettings } from "@/lib/server/orders";
import AdminHeader from "./AdminHeader";

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const euroShort = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  });

function Tile({
  label,
  value,
  sub,
  href,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  alert?: boolean;
}) {
  const body = (
    <div
      className={`h-full border p-5 transition-colors ${alert ? "border-gold bg-gold/[0.08]" : "border-gold/20 bg-ink/40"} ${href ? "hover:border-gold" : ""}`}
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-gold">{label}</p>
      <p className="mt-2 font-display text-4xl tabular-nums text-cream">{value}</p>
      {sub && <p className="mt-1 text-xs text-cream/55">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

async function Overview() {
  await connection();
  const me = await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const [dashboard, settings, menu, business] = await Promise.all([
    getDashboard(),
    getOrderSettings(),
    readMenu(),
    readBusiness(),
  ]);
  const diff = dashboard.revenue.today - dashboard.revenue.sameDayLastWeek;
  const todo =
    dashboard.actions.newOrders.length + dashboard.actions.packed.length + dashboard.actions.pendingReservations.length;

  const warnings: { text: string; href: string }[] = [];
  if (settings.ignoreHours)
    warnings.push({
      text: "Bestellungen auch außerhalb der Öffnungszeiten sind an (vorübergehend).",
      href: "/admin/bestellungen",
    });
  if (settings.paused) warnings.push({ text: "Online-Bestellungen sind pausiert.", href: "/admin/bestellungen" });
  if (impressumMissing(business))
    warnings.push({
      text: "Impressum: Name der Inhaberin/des Inhabers und Kontakt-E-Mail fehlen noch (Pflicht).",
      href: "/admin/einstellungen",
    });
  if (!hasAllergenData(menu))
    warnings.push({
      text: "Allergene sind noch nicht eingetragen (Pflicht für Online-Bestellungen).",
      href: "/admin/speisekarte",
    });
  if (!isMailerConfigured()) warnings.push({ text: "E-Mail-Versand ist nicht eingerichtet.", href: "/admin" });
  if (!isCloudinaryConfigured())
    warnings.push({ text: "Foto-Upload (Cloudinary) ist nicht eingerichtet.", href: "/admin/fotos" });

  return (
    <>
      <LiveRefresh seconds={30} />
      <p className="mt-3 text-sm text-cream/60">
        Hallo {me.name.split(" ")[0]} ·{" "}
        {new Date().toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "Europe/Berlin",
        })}
      </p>

      {/* What needs someone now */}
      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">
          {todo ? `Jetzt zu tun (${todo})` : "Gerade nichts zu tun"}
        </h2>
        {todo > 0 && (
          <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10">
            {dashboard.actions.newOrders.map((order) => (
              <li key={`o${order.id}`}>
                <Link
                  href="/admin/bestellungen"
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-gold/[0.04]"
                >
                  <span className="text-cream">
                    <span className="mr-3 rounded-full bg-gold px-2.5 py-0.5 text-xs font-semibold text-ink">
                      Neue Bestellung
                    </span>
                    {order.reference} · {order.name} · {order.method === "delivery" ? "Lieferung" : "Abholung"}
                  </span>
                  <span className="text-sm tabular-nums text-cream/65">
                    {time(order.createdAt)} · {euro(order.total)}
                  </span>
                </Link>
              </li>
            ))}
            {dashboard.actions.packed.map((order) => (
              <li key={`p${order.id}`}>
                <Link
                  href="/admin/bestellungen"
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-gold/[0.04]"
                >
                  <span className="text-cream">
                    <span className="mr-3 rounded-full bg-[#7fcf9c] px-2.5 py-0.5 text-xs font-semibold text-ink">
                      Verpackt
                    </span>
                    {order.reference} · {order.name} ·{" "}
                    {order.method === "delivery" ? "an Fahrer übergeben" : "als abholbereit markieren"}
                  </span>
                </Link>
              </li>
            ))}
            {dashboard.actions.pendingReservations.map((reservation) => (
              <li key={`r${reservation.id}`}>
                <Link
                  href="/admin/reservierungen"
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-gold/[0.04]"
                >
                  <span className="text-cream">
                    <span className="mr-3 rounded-full border border-gold/60 px-2.5 py-0.5 text-xs font-semibold text-gold-soft">
                      Reservierungsanfrage
                    </span>
                    {reservation.name} · {reservation.guests} {reservation.guests === 1 ? "Person" : "Personen"}
                  </span>
                  <span className="text-sm text-cream/65">
                    {dayLabel(reservation.date)} · {reservation.time} Uhr
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Today in numbers */}
      <section className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile
          label="Umsatz heute"
          value={euroShort(dashboard.revenue.today)}
          sub={`${diff >= 0 ? "+" : "−"}${euroShort(Math.abs(diff))} ggü. letzter Woche (${euroShort(dashboard.revenue.sameDayLastWeek)})`}
          href="/admin/berichte"
        />
        <Tile
          label="Bestellungen heute"
          value={String(dashboard.orders.today)}
          sub={`${dashboard.orders.open} offen · ${dashboard.orders.onTheWay} unterwegs`}
          href="/admin/bestellungen"
          alert={dashboard.orders.new > 0}
        />
        <Tile
          label="Gäste heute (Reservierung)"
          value={String(dashboard.reservations.todayGuests)}
          sub={`${dashboard.reservations.todayCount} Tische`}
          href="/admin/reservierungen"
        />
        <Tile
          label="Offene Anfragen"
          value={String(dashboard.reservations.pending)}
          sub="Reservierungen ab heute"
          href="/admin/reservierungen"
          alert={dashboard.reservations.pending > 0}
        />
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">Umsatz der letzten 14 Tage</h2>
          <ColumnChart
            title="Abgeschlossene Bestellungen pro Tag, in Euro"
            data={dashboard.revenue.last14.map((day) => ({
              key: day.day,
              label: dayLabel(day.day),
              value: day.total,
              detail: `${day.orders} Bestellungen`,
            }))}
            unit="euro"
            labelEvery={3}
          />
        </section>
        <section className="lg:col-span-2">
          <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">Reservierungen heute</h2>
          {dashboard.todaysBookings.length === 0 ? (
            <p className="text-cream/55">Keine Reservierungen für heute.</p>
          ) : (
            <ul className="divide-y divide-gold/10 border-y border-gold/10 text-sm">
              {dashboard.todaysBookings.map((booking) => (
                <li key={booking.id} className="flex justify-between gap-3 py-2">
                  <span className="text-cream">
                    <span className="mr-3 tabular-nums text-gold-soft">{booking.time}</span>
                    {booking.name}
                    {booking.status === "pending" && <span className="ml-2 text-xs text-[#f0a080]">unbestätigt</span>}
                  </span>
                  <span className="text-cream/60">{booking.guests} P.</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {warnings.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-gold-soft">Hinweise</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {warnings.map((warning) => (
              <li key={warning.text}>
                <Link href={warning.href} className="flex gap-2 text-[#f0a080] hover:underline">
                  <span aria-hidden>!</span>
                  {warning.text}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function AdminHome() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="dashboard" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Übersicht …</p>}>
        <Overview />
      </Suspense>
    </main>
  );
}
