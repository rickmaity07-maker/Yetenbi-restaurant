import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { restaurant } from "@/lib/data";
import { requireOwner } from "@/lib/server/auth";
import { readBusiness } from "@/lib/server/business";
import { hasDatabase } from "@/lib/server/db";
import AdminHeader from "../AdminHeader";
import BusinessForm from "./BusinessForm";

async function Settings() {
  await connection();
  await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const business = await readBusiness();
  return (
    <div className="mt-8 space-y-10">
      <BusinessForm business={business} />

      <section className="grid gap-6 md:grid-cols-2">
        <div className="border border-cream/10 p-6">
          <h2 className="font-display text-xl font-semibold text-gold-soft">Weitere Einstellungen</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/admin/reservierungen" className="text-cream underline decoration-gold/40 underline-offset-4">
                Schließtage und Feiertage
              </Link>
              <span className="text-cream/50"> · unter Reservierungen</span>
            </li>
            <li>
              <Link href="/admin/bestellungen" className="text-cream underline decoration-gold/40 underline-offset-4">
                Lieferung, Mindestbestellwert, Liefergebiet, Pause
              </Link>
              <span className="text-cream/50"> · unter Bestellungen</span>
            </li>
            <li>
              <Link href="/admin/team" className="text-cream underline decoration-gold/40 underline-offset-4">
                Zugänge für Verwaltung, Küche und Fahrer
              </Link>
            </li>
          </ul>
        </div>
        <div className="border border-cream/10 p-6">
          <h2 className="font-display text-xl font-semibold text-gold-soft">Adresse und Telefon</h2>
          <p className="mt-3 text-sm text-cream/75">
            {restaurant.street}, {restaurant.city} · {restaurant.phone}
          </p>
          <p className="mt-2 text-xs text-cream/50">
            Stehen fest in der Website, weil Karte, E-Mails und Google-Daten daran hängen. Bei einem Umzug oder einer neuen Nummer bitte den
            Entwickler informieren.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="settings" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Einstellungen …</p>}>
        <Settings />
      </Suspense>
    </main>
  );
}
