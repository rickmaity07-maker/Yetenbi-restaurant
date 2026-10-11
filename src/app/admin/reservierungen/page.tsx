import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { addDays, todayISO } from "@/lib/booking";
import { requireOwner } from "@/lib/server/auth";
import { upcomingClosures } from "@/lib/server/closures";
import { hasDatabase } from "@/lib/server/db";
import { isMailerConfigured } from "@/lib/server/email";
import { listBetween, listReservations, type Reservation, type Status } from "@/lib/server/reservations";
import { decide, removeClosedDay } from "../actions";
import { ClosedDayForm, PhoneBookingForm } from "../AdminForms";
import AdminHeader from "../AdminHeader";

const STATUS: Record<Status, { label: string; tone: string }> = {
  pending: { label: "Offen", tone: "border-gold/60 text-gold-soft" },
  confirmed: { label: "Bestätigt", tone: "border-[#7fcf9c]/60 text-[#9fe0b6]" },
  declined: { label: "Abgelehnt", tone: "border-[#f0a080]/60 text-[#f0a080]" },
  cancelled: { label: "Storniert", tone: "border-cream/30 text-cream/60" },
};

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

function Card({ reservation, past }: { reservation: Reservation; past: boolean }) {
  const status = STATUS[reservation.status];
  return (
    <li className="border border-gold/25 bg-ink/60 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-display text-2xl text-cream">
          {reservation.time} Uhr · {reservation.guests} {reservation.guests === 1 ? "Person" : "Personen"}
        </p>
        <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
      </div>
      <p className="mt-2 text-lg text-cream/90">
        {reservation.name}
        {reservation.source === "phone" && (
          <span className="ml-2 text-xs uppercase tracking-[0.2em] text-cream/50">Telefon</span>
        )}
      </p>
      <p className="mt-1 text-sm text-cream/70">
        <a className="underline decoration-gold/40 underline-offset-4" href={`tel:${reservation.phone}`}>
          {reservation.phone}
        </a>
        {reservation.email && (
          <>
            {"  ·  "}
            <a className="underline decoration-gold/40 underline-offset-4" href={`mailto:${reservation.email}`}>
              {reservation.email}
            </a>
          </>
        )}
        {"  ·  "}
        {reservation.reference} · {reservation.locale.toUpperCase()}
      </p>
      {reservation.note && (
        <p className="mt-3 border-l-2 border-gold/50 pl-3 text-sm italic text-cream/80">{reservation.note}</p>
      )}
      {reservation.staffNote && <p className="mt-2 text-xs text-cream/55">Eure Nachricht: {reservation.staffNote}</p>}

      {!past && reservation.status === "pending" && (
        <form action={decide} className="mt-5 space-y-3">
          <input type="hidden" name="id" value={reservation.id} />
          <input
            name="note"
            maxLength={400}
            placeholder="Optionale Nachricht an den Gast"
            aria-label="Optionale Nachricht an den Gast"
            className="w-full border-0 border-b border-gold/30 bg-transparent px-0 pb-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <button
              name="status"
              value="confirmed"
              className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink"
            >
              Annehmen
            </button>
            <button
              name="status"
              value="declined"
              className="rounded-full border border-cream/30 px-5 py-2 text-sm font-semibold text-cream hover:border-[#f0a080] hover:text-[#f0a080]"
            >
              Ablehnen
            </button>
          </div>
        </form>
      )}
      {!past && reservation.status === "confirmed" && (
        <form action={decide} className="mt-4">
          <input type="hidden" name="id" value={reservation.id} />
          <input type="hidden" name="note" value={reservation.staffNote} />
          <button
            name="status"
            value="cancelled"
            className="text-xs text-cream/55 underline underline-offset-4 hover:text-[#f0a080]"
          >
            Als storniert markieren
          </button>
        </form>
      )}
    </li>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-gold/20 bg-ink/40 p-6 md:p-8">
      <h2 className="font-display text-2xl font-semibold text-gold-soft">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

async function Board({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const me = await requireOwner();
  if (!hasDatabase()) {
    return <p className="mt-12 text-cream/70">Keine Datenbank verbunden (DATABASE_URL fehlt).</p>;
  }
  const past = (await searchParams).ansicht === "frueher";
  const today = todayISO();
  const [list, closures] = await Promise.all([
    past ? listBetween(addDays(today, -60), addDays(today, -1)) : listReservations(),
    upcomingClosures(),
  ]);
  const ordered = past ? [...list].reverse() : list;
  const pending = list.filter((reservation) => reservation.status === "pending");
  const byDate = new Map<string, Reservation[]>();
  for (const reservation of ordered)
    byDate.set(reservation.date, [...(byDate.get(reservation.date) ?? []), reservation]);

  return (
    <>
      <p className="mt-3 text-sm text-cream/60">
        Angemeldet als {me.name} ({me.email})
      </p>

      {!past && (
        <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-sm text-cream/75">
          <p>
            <span className="font-display text-3xl text-gold-soft">{pending.length}</span> offen
          </p>
          <p>
            <span className="font-display text-3xl text-gold-soft">
              {list.filter((reservation) => reservation.status === "confirmed").length}
            </span>{" "}
            bestätigt (ab heute)
          </p>
          {!isMailerConfigured() && (
            <p className="self-end text-[#f0a080]">E-Mail-Versand ist noch nicht eingerichtet.</p>
          )}
        </div>
      )}

      <nav className="mt-10 flex gap-6 border-b border-gold/20 text-sm" aria-label="Ansicht">
        <Link
          href="/admin/reservierungen"
          className={`pb-3 ${!past ? "border-b border-gold text-gold-soft" : "text-cream/60 hover:text-cream"}`}
        >
          Ab heute
        </Link>
        <Link
          href="/admin/reservierungen?ansicht=frueher"
          className={`pb-3 ${past ? "border-b border-gold text-gold-soft" : "text-cream/60 hover:text-cream"}`}
        >
          Letzte 60 Tage
        </Link>
      </nav>

      {ordered.length === 0 && (
        <p className="mt-12 font-display text-2xl italic text-cream/70">
          {past ? "Keine Reservierungen in den letzten 60 Tagen." : "Noch keine Reservierungen ab heute."}
        </p>
      )}

      <div className="mt-10 space-y-12">
        {[...byDate.entries()].map(([date, items]) => (
          <section key={date}>
            <h2 className="font-display text-3xl font-semibold text-gold-soft">
              {dayLabel(date)}
              <span className="ml-3 text-base text-cream/55">
                {items
                  .filter((reservation) => reservation.status === "confirmed")
                  .reduce((sum, reservation) => sum + reservation.guests, 0)}{" "}
                Gäste bestätigt
              </span>
            </h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-2">
              {items.map((reservation) => (
                <Card key={reservation.id} reservation={reservation} past={past} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {!past && (
        <div className="mt-16 grid gap-6">
          <Panel title="Telefonische Reservierung eintragen">
            <PhoneBookingForm />
          </Panel>
          <Panel title="Schließtage">
            <p className="mb-5 text-sm text-cream/65">
              An diesen Tagen nimmt die Website keine Reservierungen an; die Anfahrt zeigt den Hinweis.
            </p>
            {closures.length > 0 && (
              <ul className="mb-6 space-y-2">
                {closures.map((closure) => (
                  <li
                    key={closure.date}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/15 pb-2"
                  >
                    <span className="text-cream">
                      {dayLabel(closure.date)}
                      {closure.note && <span className="text-cream/60"> · {closure.note}</span>}
                    </span>
                    <form action={removeClosedDay}>
                      <input type="hidden" name="date" value={closure.date} />
                      <button className="text-xs text-cream/60 underline underline-offset-4 hover:text-[#f0a080]">
                        Entfernen
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <ClosedDayForm />
          </Panel>
        </div>
      )}
    </>
  );
}

export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="reservations" />
      {/* reads the session, the URL and the database: streams in at request time */}
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Reservierungen …</p>}>
        <Board searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
