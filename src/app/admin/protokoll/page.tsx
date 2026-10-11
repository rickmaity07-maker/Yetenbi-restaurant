import { Suspense } from "react";
import { connection } from "next/server";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { auditActors, listAudit } from "@/lib/server/audit";
import { requireOwner } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import AdminHeader from "../AdminHeader";

type Params = Promise<Record<string, string | string[] | undefined>>;

const AREAS: Record<string, string> = {
  orders: "Bestellungen",
  reservations: "Reservierungen",
  menu: "Speisekarte",
  photos: "Fotos",
  settings: "Einstellungen",
  team: "Team",
  login: "Anmeldungen",
  customers: "Kunden",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
const field =
  "border-0 border-b border-gold/30 bg-transparent pb-1 text-sm text-cream [color-scheme:dark] focus:border-gold focus:outline-none";

async function Log({ searchParams }: { searchParams: Params }) {
  await connection();
  await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string).slice(0, 80) : "");
  const filter = { area: AREAS[one("bereich")] ? one("bereich") : "", actor: one("wer"), q: one("q") };
  const [entries, actors] = await Promise.all([listAudit({ ...filter, limit: 300 }), auditActors()]);

  return (
    <>
      <form className="mt-6 flex flex-wrap items-end gap-5" action="/admin/protokoll">
        <label className="flex flex-col gap-1 text-xs text-cream/60">
          Bereich
          <select name="bereich" defaultValue={filter.area} className={field}>
            <option value="" className="bg-coal">
              Alle
            </option>
            {Object.entries(AREAS).map(([k, v]) => (
              <option key={k} value={k} className="bg-coal">
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-cream/60">
          Wer
          <select name="wer" defaultValue={filter.actor} className={field}>
            <option value="" className="bg-coal">
              Alle
            </option>
            {actors.map((actor) => (
              <option key={actor} value={actor} className="bg-coal">
                {actor}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-cream/60">
          Suche
          <input
            name="q"
            defaultValue={filter.q}
            placeholder="z. B. YO-7KQ2, Kitfo"
            className={`${field} w-56 placeholder:text-cream/35`}
          />
        </label>
        <button className="rounded-full border border-cream/25 px-4 py-1.5 text-sm text-cream hover:border-gold">
          Filtern
        </button>
      </form>

      <p className="mt-4 text-xs text-cream/50">
        Die letzten {entries.length} Einträge. Einträge werden nach einem Jahr gelöscht.
      </p>
      {entries.length === 0 ? (
        <p className="mt-8 font-display text-xl italic text-cream/60">Noch keine Einträge.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gold/30 text-left text-[0.62rem] uppercase tracking-[0.22em] text-gold">
                <th className="py-2 pr-4 font-semibold">Zeit</th>
                <th className="py-2 pr-4 font-semibold">Wer</th>
                <th className="py-2 pr-4 font-semibold">Bereich</th>
                <th className="py-2 pr-4 font-semibold">Was</th>
                <th className="py-2 font-semibold">Betrifft</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-cream/[0.07] align-top">
                  <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-cream/60">{when(entry.at)}</td>
                  <td className="py-2 pr-4 text-cream">
                    {entry.actor}
                    {entry.role && (
                      <span className="block text-xs text-cream/45">
                        {ROLE_LABEL[entry.role as Role] ?? entry.role}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-cream/70">{AREAS[entry.area] ?? entry.area}</td>
                  <td className="py-2 pr-4 text-cream">{entry.action}</td>
                  <td className="py-2 text-cream/70">{entry.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AuditPage({ searchParams }: { searchParams: Params }) {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="log" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Protokoll …</p>}>
        <Log searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
