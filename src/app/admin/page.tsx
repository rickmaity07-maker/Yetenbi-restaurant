import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LalibelaCross } from "@/components/heritage/Ornaments";
import { isAdmin, isAdminConfigured } from "@/lib/server/admin-auth";
import { hasDatabase } from "@/lib/server/db";
import { isMailerConfigured } from "@/lib/server/mailer";
import { listReservations, type Reservation, type Status } from "@/lib/server/reservations";
import { decide, logout } from "./actions";

const STATUS: Record<Status, { label: string; tone: string }> = {
  pending: { label: "Offen", tone: "border-gold/60 text-gold-soft" },
  confirmed: { label: "Bestätigt", tone: "border-[#7fcf9c]/60 text-[#9fe0b6]" },
  declined: { label: "Abgelehnt", tone: "border-[#f0a080]/60 text-[#f0a080]" },
  cancelled: { label: "Storniert", tone: "border-cream/30 text-cream/60" },
};

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function Card({ r }: { r: Reservation }) {
  const s = STATUS[r.status];
  return (
    <li className="border border-gold/25 bg-ink/60 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-display text-2xl text-cream">
          {r.time} Uhr · {r.guests} {r.guests === 1 ? "Person" : "Personen"}
        </p>
        <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
      </div>
      <p className="mt-2 text-lg text-cream/90">{r.name}</p>
      <p className="mt-1 text-sm text-cream/70">
        <a className="underline decoration-gold/40 underline-offset-4" href={`tel:${r.phone}`}>{r.phone}</a>
        {"  ·  "}
        <a className="underline decoration-gold/40 underline-offset-4" href={`mailto:${r.email}`}>{r.email}</a>
        {"  ·  "}
        {r.reference} · {r.locale.toUpperCase()}
      </p>
      {r.note && <p className="mt-3 border-l-2 border-gold/50 pl-3 text-sm italic text-cream/80">{r.note}</p>}
      {r.staffNote && <p className="mt-2 text-xs text-cream/55">Eure Nachricht: {r.staffNote}</p>}

      {r.status === "pending" && (
        <form action={decide} className="mt-5 space-y-3">
          <input type="hidden" name="id" value={r.id} />
          <input
            name="note"
            maxLength={400}
            placeholder="Optionale Nachricht an den Gast"
            aria-label="Optionale Nachricht an den Gast"
            className="w-full border-0 border-b border-gold/30 bg-transparent px-0 pb-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <button name="status" value="confirmed" className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink">
              Annehmen
            </button>
            <button name="status" value="declined" className="rounded-full border border-cream/30 px-5 py-2 text-sm font-semibold text-cream hover:border-[#f0a080] hover:text-[#f0a080]">
              Ablehnen
            </button>
          </div>
        </form>
      )}
      {r.status === "confirmed" && (
        <form action={decide} className="mt-4">
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="note" value={r.staffNote} />
          <button name="status" value="cancelled" className="text-xs text-cream/55 underline underline-offset-4 hover:text-[#f0a080]">
            Als storniert markieren
          </button>
        </form>
      )}
    </li>
  );
}

async function Board() {
  // Always decide at request time (env, cookie, database), never in the build's static shell.
  await connection();
  if (!isAdminConfigured()) {
    return <Notice title="Noch nicht eingerichtet" text="Setzt ADMIN_PASSWORD in den Umgebungsvariablen, um die Verwaltung zu nutzen." />;
  }
  if (!(await isAdmin())) redirect("/admin/login");
  if (!hasDatabase()) {
    return <Notice title="Keine Datenbank verbunden" text="Ohne DATABASE_URL laufen Anfragen über WhatsApp. Verbindet eine Neon-Datenbank und führt npm run db:setup aus." />;
  }

  const all = await listReservations();
  const pending = all.filter((r) => r.status === "pending");
  const byDate = new Map<string, Reservation[]>();
  for (const r of all) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-sm text-cream/75">
        <p>
          <span className="font-display text-3xl text-gold-soft">{pending.length}</span> offen
        </p>
        <p>
          <span className="font-display text-3xl text-gold-soft">{all.filter((r) => r.status === "confirmed").length}</span> bestätigt (ab heute)
        </p>
        {!isMailerConfigured() && <p className="self-end text-[#f0a080]">E-Mail-Versand ist noch nicht eingerichtet.</p>}
      </div>

      {all.length === 0 && <p className="mt-16 font-display text-2xl italic text-cream/70">Noch keine Reservierungen ab heute.</p>}

      <div className="mt-12 space-y-12">
        {[...byDate.entries()].map(([date, list]) => (
          <section key={date}>
            <h2 className="font-display text-3xl font-semibold text-gold-soft">{dayLabel(date)}</h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-2">
              {list.map((r) => (
                <Card key={r.id} r={r} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-12 border border-gold/30 p-6">
      <p className="font-display text-2xl text-cream">{title}</p>
      <p className="mt-2 text-cream/70">{text}</p>
    </div>
  );
}

export default function AdminPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-16 md:py-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <LalibelaCross className="h-8 w-8 text-gold" />
          <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">Reservierungen</h1>
        </div>
        <form action={logout}>
          <button className="text-sm text-cream/70 underline underline-offset-4 hover:text-cream">Abmelden</button>
        </form>
      </div>
      {/* reads the session cookie and the database: streams in at request time */}
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Reservierungen …</p>}>
        <Board />
      </Suspense>
    </main>
  );
}
