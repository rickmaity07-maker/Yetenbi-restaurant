import { Suspense } from "react";
import { connection } from "next/server";
import { menu } from "@/lib/data";
import { DRINK_CATEGORIES, hasAllergenData, infoOf } from "@/lib/menu-info";
import { requireOwner } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { readMenuInfo } from "@/lib/server/menu-info";
import AdminHeader from "../AdminHeader";
import CategoryForm from "./CategoryForm";

async function Editor() {
  await connection();
  await requireOwner();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const info = await readMenuInfo();
  return (
    <>
      <div className="mt-8 max-w-3xl space-y-3 text-sm leading-relaxed text-cream/70">
        <p>
          Für Online-Bestellungen müssen die 14 Allergene und bestimmte Zusatzstoffe <strong className="text-cream">vor der Bestellung</strong> bei
          jedem Gericht stehen (LMIV, LMIDV). Kreuzt hier an, was jedes Gericht enthält, auch als Zutat von Soßen, Gewürzmischungen oder
          Injera. Die Kürzel erscheinen dann auf der Speisekarte und der Bestellseite, mit Erklärung.
        </p>
        <p>
          Bei Getränken in Flaschen oder Dosen: Menge eintragen (für den Literpreis) und, falls ihr Pfand nehmt, den Pfandbetrag. Das Pfand
          wird beim Bestellen getrennt ausgewiesen und berechnet.
        </p>
        <p>
          „Glutenfrei“ darf nur stehen, wenn ein Gericht unter 20 mg Gluten pro kg enthält, auch durch Spuren aus der Küche. Ist Injera
          mit Weizen- oder Gerstenmehl gemischt oder lässt sich das nicht sicher sagen, wählt „Ohne glutenhaltige Zutaten“ oder „Keine
          Angabe“.
        </p>
        {!hasAllergenData(info) && (
          <p className="border-l-2 border-[#f0a080] pl-4 text-[#f0a080]">
            Noch keine Allergene eingetragen: die Website sagt bis dahin „Fragen zu Allergenen beantworten wir gerne“.
          </p>
        )}
      </div>
      <div className="mt-10 space-y-8">
        {menu.map((c) => (
          <CategoryForm
            key={c.id}
            category={c.id}
            title={c.title.de}
            drinks={DRINK_CATEGORIES.has(c.id)}
            rows={c.items.map((item, i) => {
              const id = `${c.id}-${i}`;
              return { id, name: item.name.de, price: item.price, glutenTag: item.tags?.includes("glutenfree") ?? false, info: infoOf(info, id) };
            })}
          />
        ))}
      </div>
    </>
  );
}

export default function MenuInfoPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-16 md:py-24">
      <AdminHeader active="menu" />
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Speisekarte …</p>}>
        <Editor />
      </Suspense>
    </main>
  );
}
