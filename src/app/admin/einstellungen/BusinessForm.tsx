"use client";

import { useActionState } from "react";
import { DAY_NAMES, type Business } from "@/lib/business";
import { saveBusinessSettings } from "./actions";

const field = "border-0 border-b border-gold/30 bg-transparent px-0 pb-1.5 pt-1 text-base text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none [color-scheme:dark]";
const label = "text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-gold";

export default function BusinessForm({ business }: { business: Business }) {
  const [state, action, pending] = useActionState(saveBusinessSettings, null);
  return (
    <form action={action} className="space-y-10">
      <section className="border border-gold/20 bg-ink/40 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">Öffnungszeiten</h2>
        <p className="mt-2 text-sm text-cream/60">
          Gelten sofort überall: Öffnungszeiten auf der Website, Reservierungszeiten (bis 1,5 Std. vor Schluss), Online-Bestellung (bis 30 Min. vor
          Schluss) und Google. Einzelne Feiertage oder Betriebsferien tragt ihr unter Reservierungen → Schließtage ein.
        </p>
        <div className="mt-6 divide-y divide-cream/10">
          {DAY_NAMES.map((name, d) => {
            const h = business.hours[d];
            return (
              <fieldset key={name} className="grid grid-cols-[7.5rem_1fr] items-center gap-4 py-3 sm:grid-cols-[9rem_7rem_1fr]">
                <legend className="sr-only">{name}</legend>
                <span className="text-cream">{name}</span>
                <label className="flex items-center gap-2 text-sm text-cream/80">
                  <input type="checkbox" name={`open-${d}`} defaultChecked={Boolean(h)} className="peer h-4 w-4 accent-[#c9a24a]" /> geöffnet
                </label>
                <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                  <input type="time" name={`from-${d}`} defaultValue={h?.open ?? "11:00"} step={900} aria-label={`${name} öffnet`} className={`${field} w-28`} />
                  <span className="text-cream/50">bis</span>
                  <input type="time" name={`to-${d}`} defaultValue={h?.close ?? "22:00"} step={900} aria-label={`${name} schließt`} className={`${field} w-28`} />
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>

      <section className="border border-gold/20 bg-ink/40 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">Angaben für Impressum und Datenschutz</h2>
        <p className="mt-2 text-sm text-cream/60">
          Pflicht nach § 5 DDG: vollständiger Name der Inhaberin oder des Inhabers und eine E-Mail-Adresse. Die USt-IdNr. nur, wenn es eine gibt.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={label}>Inhaber/in (vollständiger Name)</span>
            <input name="ownerName" defaultValue={business.ownerName} maxLength={120} autoComplete="name" className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Kontakt-E-Mail</span>
            <input name="contactEmail" type="email" defaultValue={business.contactEmail} maxLength={120} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>USt-IdNr. (optional)</span>
            <input name="vatId" defaultValue={business.vatId} maxLength={20} placeholder="DE123456789" className={field} />
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-4 rounded-full border border-gold/30 bg-coal/95 px-4 py-3 backdrop-blur sm:w-max">
        <button disabled={pending} className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink disabled:opacity-60">
          {pending ? "Speichern …" : "Alles speichern"}
        </button>
        {state?.ok && <p role="status" className="text-sm text-[#9fe0b6]">{state.ok}</p>}
        {state?.error && <p role="alert" className="text-sm text-[#f0a080]">{state.error}</p>}
      </div>
    </form>
  );
}
