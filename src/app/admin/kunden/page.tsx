import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { encodeKey, listCustomers } from "@/lib/server/customers";
import { hasDatabase } from "@/lib/server/db";
import AdminHeader from "../AdminHeader";

type Params = Promise<Record<string, string | string[] | undefined>>;

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/Berlin",
  });

async function List({ searchParams }: { searchParams: Params }) {
  await connection();
  await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const all = await listCustomers(search);
  const shown = all.slice(0, 200);

  return (
    <>
      <form action="/admin/kunden" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-cream/60">
          Suche nach Name, E-Mail oder Telefon
          <input
            name="q"
            defaultValue={search}
            placeholder="z. B. Müller, 0176…"
            className="w-72 border-0 border-b border-gold/30 bg-transparent pb-1 text-base text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none"
          />
        </label>
        <button className="rounded-full border border-cream/25 px-4 py-1.5 text-sm text-cream hover:border-gold">
          Suchen
        </button>
        {search && (
          <Link href="/admin/kunden" className="text-sm text-cream/55 underline underline-offset-4">
            Alle zeigen
          </Link>
        )}
      </form>
      <p className="mt-4 text-xs text-cream/50">
        {all.length} {all.length === 1 ? "Gast" : "Gäste"}
        {all.length > shown.length && `, die letzten ${shown.length} angezeigt`} · Bestellungen und Reservierungen
        werden nach 180 Tagen gelöscht.
      </p>

      {shown.length === 0 ? (
        <p className="mt-8 font-display text-xl italic text-cream/60">Keine Gäste gefunden.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gold/30 text-left text-[0.62rem] uppercase tracking-[0.22em] text-gold">
                <th className="py-2 pr-4 font-semibold">Gast</th>
                <th className="py-2 pr-4 font-semibold">Kontakt</th>
                <th className="py-2 pr-4 text-right font-semibold">Bestellungen</th>
                <th className="py-2 pr-4 text-right font-semibold">Umsatz</th>
                <th className="py-2 pr-4 text-right font-semibold">Reserv.</th>
                <th className="py-2 text-right font-semibold">Zuletzt</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((customer) => (
                <tr key={customer.key} className="border-b border-cream/[0.07] hover:bg-gold/[0.04]">
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/admin/kunden/${encodeKey(customer.key)}`}
                      className="font-semibold text-cream underline decoration-gold/30 underline-offset-4 hover:decoration-gold"
                    >
                      {customer.name || "Ohne Namen"}
                    </Link>
                    <span className="ml-2 inline-flex gap-1.5 align-middle">
                      {customer.hasAccount && (
                        <span className="rounded-full border border-cream/20 px-2 text-[0.65rem] text-cream/60">
                          Konto
                        </span>
                      )}
                      {customer.blocked && (
                        <span className="rounded-full border border-[#f0a080]/70 px-2 text-[0.65rem] text-[#f0a080]">
                          gesperrt
                        </span>
                      )}
                      {customer.rejected > 0 && (
                        <span className="rounded-full border border-[#f0a080]/40 px-2 text-[0.65rem] text-[#f0a080]/90">
                          {customer.rejected}× abgelehnt
                        </span>
                      )}
                      {customer.note && (
                        <span className="rounded-full border border-gold/40 px-2 text-[0.65rem] text-gold-soft">
                          Notiz
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-cream/65">
                    {customer.email || "–"}
                    {customer.phone && <span className="block text-xs text-cream/45">{customer.phone}</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-cream">{customer.completed}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-cream">
                    {customer.revenue ? euro(customer.revenue) : "–"}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-cream">{customer.bookings.length || "–"}</td>
                  <td className="py-2.5 text-right tabular-nums text-cream/60">{day(customer.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function CustomersPage({ searchParams }: { searchParams: Params }) {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="customers" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Kunden …</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
