"use client";

import { useActionState } from "react";
import { ADDITIVES, ALLERGENS, type ItemInfo } from "@/lib/menu-info";
import { saveCategory } from "./actions";

type Row = { id: string; name: string; price: string; glutenTag: boolean; info: ItemInfo };

const box = "flex items-center gap-1.5 rounded border border-cream/15 px-2 py-1 text-xs text-cream/80 has-[:checked]:border-gold has-[:checked]:bg-gold/15 has-[:checked]:text-gold-soft";
const field = "w-24 border-0 border-b border-gold/30 bg-transparent px-0 pb-1 text-sm text-cream focus:border-gold focus:outline-none";

/** One menu category: allergens and additives per item, volume and deposit for drinks, the gluten wording for food. */
export default function CategoryForm({ category, title, drinks, rows }: { category: string; title: string; drinks: boolean; rows: Row[] }) {
  const [state, action, pending] = useActionState(saveCategory, null);
  return (
    <form action={action} className="border border-gold/20 bg-ink/40 p-5 md:p-7">
      <input type="hidden" name="category" value={category} />
      <h2 className="font-display text-2xl font-semibold text-gold-soft">{title}</h2>
      <ul className="mt-5 divide-y divide-gold/10">
        {rows.map((r) => (
          <li key={r.id} className="space-y-3 py-5">
            <p className="text-cream">
              <strong className="font-semibold">{r.name}</strong> <span className="text-cream/50">· {r.price} €</span>
            </p>
            <fieldset>
              <legend className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gold">Allergene</legend>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGENS.map((a) => (
                  <label key={a.code} className={box} title={a.label.de}>
                    <input type="checkbox" name={`${r.id}|allergen`} value={a.code} defaultChecked={r.info.allergens.includes(a.code)} className="accent-[#c9a24a]" />
                    <span className="font-semibold">{a.code}</span> {a.label.de}
                  </label>
                ))}
              </div>
            </fieldset>
            <details open={r.info.additives.length > 0}>
              <summary className="cursor-pointer text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gold">
                Zusatzstoffe {r.info.additives.length > 0 && `(${r.info.additives.join(", ")})`}
              </summary>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ADDITIVES.map((a) => (
                  <label key={a.code} className={box}>
                    <input type="checkbox" name={`${r.id}|additive`} value={a.code} defaultChecked={r.info.additives.includes(a.code)} className="accent-[#c9a24a]" />
                    <span className="font-semibold">{a.code}</span> {a.label.de}
                  </label>
                ))}
              </div>
            </details>
            {drinks ? (
              <div className="flex flex-wrap gap-6">
                <label className="flex items-end gap-2 text-sm text-cream/70">
                  Menge (Liter)
                  <input name={`${r.id}|volume`} inputMode="decimal" placeholder="0,33" defaultValue={r.info.volume ? String(r.info.volume).replace(".", ",") : ""} className={field} />
                </label>
                <label className="flex items-end gap-2 text-sm text-cream/70">
                  Pfand (€)
                  <input name={`${r.id}|deposit`} inputMode="decimal" placeholder="0,25" defaultValue={r.info.deposit ? r.info.deposit.toFixed(2).replace(".", ",") : ""} className={field} />
                </label>
              </div>
            ) : (
              <label className="flex flex-wrap items-center gap-3 text-sm text-cream/70">
                Gluten-Angabe
                <select name={`${r.id}|gluten`} defaultValue={r.info.gluten} className="border-0 border-b border-gold/30 bg-transparent text-cream [color-scheme:dark] focus:outline-none">
                  <option value="keep" className="bg-coal">
                    Wie bisher ({r.glutenTag ? "„Glutenfrei“" : "keine Angabe"})
                  </option>
                  <option value="free" className="bg-coal">
                    „Glutenfrei“ (unter 20 mg/kg, auch ohne Spuren)
                  </option>
                  <option value="noGluten" className="bg-coal">
                    „Ohne glutenhaltige Zutaten“
                  </option>
                  <option value="none" className="bg-coal">
                    Keine Angabe
                  </option>
                </select>
              </label>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button disabled={pending} className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink disabled:opacity-60">
          {pending ? "Speichern …" : `${title} speichern`}
        </button>
        {state?.ok && <p role="status" className="text-sm text-[#9fe0b6]">{state.ok}</p>}
        {state?.error && <p role="alert" className="text-sm text-[#f0a080]">{state.error}</p>}
      </div>
    </form>
  );
}
