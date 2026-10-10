import { Suspense } from "react";
import { connection } from "next/server";
import { hasAllergenData, priceText } from "@/lib/menu";
import { requireOwner } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { readMenu } from "@/lib/server/menu";
import AdminHeader from "../AdminHeader";
import { moveEntry, toggleAvailable } from "./actions";
import { CategoryForm, DishForm } from "./Forms";

const small = "rounded-full border border-cream/25 px-2.5 py-0.5 text-xs text-cream/75 hover:border-gold hover:text-gold-soft disabled:opacity-30";

function Move({ kind, id, first, last }: { kind: "category" | "item"; id: string; first: boolean; last: boolean }) {
  return (
    <form action={moveEntry} className="flex gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button name="dir" value="up" disabled={first} aria-label="Nach oben" className={small}>
        ↑
      </button>
      <button name="dir" value="down" disabled={last} aria-label="Nach unten" className={small}>
        ↓
      </button>
    </form>
  );
}

async function Editor() {
  await connection();
  await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const menu = await readMenu();
  const categories = menu.map((c) => ({ id: c.id, title: c.title.de, drinks: c.drinks }));
  return (
    <>
      <div className="mt-8 max-w-3xl space-y-3 text-sm leading-relaxed text-cream/70">
        <p>
          Hier pflegt ihr die ganze Speisekarte: Kategorien und Gerichte anlegen, ändern, sortieren und löschen. Jede Änderung ist sofort auf
          der Website und beim Online-Bestellen sichtbar. „Ausverkauft“ nimmt ein Gericht nur für heute aus der Bestellung.
        </p>
        <p>
          Für Online-Bestellungen müssen die 14 Allergene und bestimmte Zusatzstoffe bei jedem Gericht stehen (LMIV, LMIDV), auch aus Soßen,
          Gewürzmischungen und Injera. „Glutenfrei“ nur bei unter 20 mg Gluten pro kg, auch ohne Spuren aus der Küche.
        </p>
        {!hasAllergenData(menu) && (
          <p className="border-l-2 border-[#f0a080] pl-4 text-[#f0a080]">Noch keine Allergene eingetragen: die Website sagt bis dahin „Fragen zu Allergenen beantworten wir gerne“.</p>
        )}
      </div>

      <div className="mt-10 space-y-10">
        {menu.map((c, ci) => (
          <section key={c.id} className="border border-gold/20 bg-ink/40 p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-gold-soft">
                {c.title.de} <span className="text-base text-cream/45">({c.items.length})</span>
                {c.drinks && <span className="ml-3 align-middle text-xs uppercase tracking-[0.2em] text-cream/50">Getränke</span>}
              </h2>
              <Move kind="category" id={c.id} first={ci === 0} last={ci === menu.length - 1} />
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-cream/60 hover:text-cream">Kategorie bearbeiten</summary>
              <div className="mt-4">
                <CategoryForm category={c} />
              </div>
            </details>

            <ul className="mt-5 divide-y divide-gold/10 border-y border-gold/10">
              {c.items.map((d, di) => (
                <li key={d.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className={d.available ? "text-cream" : "text-cream/45 line-through"}>
                      <strong className="font-semibold">{d.name.de}</strong> <span className="text-cream/55">· {priceText(d.price)} €</span>
                      {!d.orderable && <span className="ml-2 rounded-full border border-cream/20 px-2 py-0.5 text-[0.65rem] text-cream/55 no-underline">nur Karte</span>}
                      {d.allergens.length > 0 && <span className="ml-2 text-xs text-cream/45">Allergene {d.allergens.join(", ")}</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <form action={toggleAvailable}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="available" value={d.available ? "false" : "true"} />
                        <button
                          className={`rounded-full px-3 py-0.5 text-xs font-semibold ${d.available ? "border border-[#f0a080]/60 text-[#f0a080] hover:bg-[#f0a080] hover:text-ink" : "bg-[#7fcf9c] text-ink"}`}
                        >
                          {d.available ? "Ausverkauft" : "Wieder verfügbar"}
                        </button>
                      </form>
                      <Move kind="item" id={d.id} first={di === 0} last={di === c.items.length - 1} />
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-cream/55 hover:text-cream">Bearbeiten</summary>
                    <div className="mt-4">
                      <DishForm dish={d} categories={categories} categoryId={c.id} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-gold-soft hover:text-gold">+ Gericht in „{c.title.de}“ hinzufügen</summary>
              <div className="mt-4">
                <DishForm categories={categories} categoryId={c.id} />
              </div>
            </details>
          </section>
        ))}
      </div>

      <details className="mt-10 border border-dashed border-gold/30 p-5 md:p-7">
        <summary className="cursor-pointer font-display text-xl text-gold-soft">+ Neue Kategorie</summary>
        <div className="mt-4">
          <CategoryForm />
        </div>
      </details>
    </>
  );
}

export default function MenuAdminPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-16 md:py-24">
      <AdminHeader active="menu" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Speisekarte …</p>}>
        <Editor />
      </Suspense>
    </main>
  );
}
