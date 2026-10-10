import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { decodeKey, encodeKey, getCustomer } from "@/lib/server/customers";
import { hasDatabase } from "@/lib/server/db";
import AdminHeader from "../../AdminHeader";
import { blockCustomer } from "../actions";
import NoteForm from "../NoteForm";

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const when = (iso: string) => new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const date = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" });

const ORDER_STATUS: Record<string, string> = {
  new: "neu", accepted: "angenommen", cooked: "zubereitet", packed: "verpackt", ready: "abholbereit",
  on_the_way: "unterwegs", completed: "abgeschlossen", rejected: "abgelehnt", cancelled: "storniert",
};
const BOOKING_STATUS: Record<string, string> = { pending: "offen", confirmed: "bestätigt", declined: "abgelehnt", cancelled: "storniert" };

async function Detail({ params }: { params: Promise<{ key: string }> }) {
  await connection();
  await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const key = decodeKey((await params).key);
  const c = key ? await getCustomer(key) : null;
  if (!c) notFound();

  return (
    <>
      <Link href="/admin/kunden" className="mt-6 inline-block text-sm text-cream/60 underline underline-offset-4 hover:text-cream">
        ← Alle Kunden
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h2 className="font-display text-3xl font-semibold text-cream">{c.name || "Ohne Namen"}</h2>
          <p className="mt-1 text-cream/70">
            {c.email && (
              <a href={`mailto:${c.email}`} className="underline decoration-gold/40 underline-offset-4">
                {c.email}
              </a>
            )}
            {c.email && c.phone && " · "}
            {c.phone && (
              <a href={`tel:${c.phone}`} className="underline decoration-gold/40 underline-offset-4">
                {c.phone}
              </a>
            )}
          </p>
          <p className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-cream/20 px-2.5 py-0.5 text-cream/65">{c.hasAccount ? "Mit Kundenkonto" : "Ohne Konto"}</span>
            {c.blocked && <span className="rounded-full border border-[#f0a080]/70 px-2.5 py-0.5 text-[#f0a080]">Für Online-Bestellungen gesperrt</span>}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-6 text-right">
          <div>
            <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-gold">Bestellungen</dt>
            <dd className="font-display text-3xl tabular-nums text-cream">{c.completed}</dd>
          </div>
          <div>
            <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-gold">Umsatz</dt>
            <dd className="font-display text-3xl tabular-nums text-cream">{euro(c.revenue)}</dd>
          </div>
          <div>
            <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-gold">Reservierungen</dt>
            <dd className="font-display text-3xl tabular-nums text-cream">{c.bookings.length}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h3 className="font-display text-xl font-semibold text-gold-soft">Bestellungen</h3>
          {c.orders.length === 0 ? (
            <p className="mt-3 text-sm text-cream/55">Keine.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gold/10 border-y border-gold/10 text-sm">
              {c.orders.map((o) => (
                <li key={o.reference} className="flex flex-wrap justify-between gap-3 py-2">
                  <span className="text-cream">
                    {o.reference} <span className="text-cream/50">· {o.method === "delivery" ? "Lieferung" : "Abholung"}</span>
                  </span>
                  <span className="tabular-nums text-cream/65">
                    {when(o.createdAt)} · {ORDER_STATUS[o.status] ?? o.status} · {euro(o.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="font-display text-xl font-semibold text-gold-soft">Reservierungen</h3>
          {c.bookings.length === 0 ? (
            <p className="mt-3 text-sm text-cream/55">Keine.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gold/10 border-y border-gold/10 text-sm">
              {c.bookings.map((b) => (
                <li key={b.reference} className="flex flex-wrap justify-between gap-3 py-2">
                  <span className="text-cream">
                    {date(b.date)} · {b.time} Uhr · {b.guests} P.
                  </span>
                  <span className="text-cream/65">
                    {BOOKING_STATUS[b.status] ?? b.status}
                    {b.source === "phone" && " · telefonisch"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-10 max-w-2xl">
        <h3 className="font-display text-xl font-semibold text-gold-soft">Notiz des Teams</h3>
        <div className="mt-3">
          <NoteForm customer={encodeKey(c.key)} note={c.note} />
        </div>
      </section>

      {c.phone && !c.blocked && (
        <form action={blockCustomer} className="mt-8">
          <input type="hidden" name="key" value={encodeKey(c.key)} />
          <button className="rounded-full border border-[#f0a080]/70 px-4 py-1.5 text-xs font-semibold text-[#f0a080] hover:bg-[#f0a080] hover:text-ink">
            Telefonnummer für Online-Bestellungen sperren
          </button>
        </form>
      )}
    </>
  );
}

export default function CustomerPage({ params }: { params: Promise<{ key: string }> }) {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="customers" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Gast …</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
