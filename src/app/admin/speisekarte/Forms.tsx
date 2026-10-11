"use client";

import { useActionState } from "react";
import { ADDITIVES, ALLERGENS, DISH_TAGS, type Dish, type MenuCategory } from "@/lib/menu";
import { removeCategory, removeDish, saveCategory, saveDish, type MenuState } from "./actions";

const field =
  "w-full border-0 border-b border-gold/30 bg-transparent px-0 pb-1.5 pt-1 text-base text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none [color-scheme:dark]";
const label = "text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-gold";
const chip =
  "flex cursor-pointer items-center gap-1.5 rounded border border-cream/15 px-2 py-1 text-xs text-cream/80 has-[:checked]:border-gold has-[:checked]:bg-gold/15 has-[:checked]:text-gold-soft";
const TAG_LABEL: Record<string, string> = { special: "Hausspezialität", spicy: "Scharf", mild: "Mild", vegan: "Vegan" };

function Message({ state }: { state: MenuState }) {
  if (state?.error)
    return (
      <p role="alert" className="text-sm text-[#f0a080]">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="text-sm text-[#9fe0b6]">
        {state.ok}
      </p>
    );
  return null;
}

function Field({
  name,
  title,
  value,
  ...rest
}: { name: string; title: string; value?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className={label}>{title}</span>
      <input name={name} defaultValue={value} className={field} {...rest} />
    </label>
  );
}

/** Text in three languages; only German is required (the others fall back to it). */
function ThreeLanguages({
  name,
  title,
  value,
  area,
  required,
}: {
  name: string;
  title: string;
  value?: { de: string; en: string; am: string } | null;
  area?: boolean;
  required?: boolean;
}) {
  const one = (lang: "de" | "en" | "am", hint: string) =>
    area ? (
      <label key={lang} className="flex flex-col gap-1">
        <span className={label}>
          {title} {hint}
        </span>
        <textarea
          name={`${name}_${lang}`}
          defaultValue={value?.[lang] ?? ""}
          rows={2}
          maxLength={400}
          className={`${field} resize-y`}
        />
      </label>
    ) : (
      <Field
        key={lang}
        name={`${name}_${lang}`}
        title={`${title} ${hint}`}
        value={value?.[lang] ?? ""}
        maxLength={80}
        required={required && lang === "de"}
      />
    );
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[one("de", "(Deutsch)"), one("en", "(Englisch)"), one("am", "(Amharisch)")]}
    </div>
  );
}

/* ---------- category ---------- */

export function CategoryForm({ category }: { category?: MenuCategory }) {
  const [state, action, pending] = useActionState(saveCategory, null);
  const [delState, delAction, deleting] = useActionState(removeCategory, null);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        {category && <input type="hidden" name="id" value={category.id} />}
        <ThreeLanguages name="title" title="Name" value={category?.title} required />
        <ThreeLanguages name="note" title="Hinweis" value={category?.note} area />
        <label className="flex items-center gap-2 text-sm text-cream/85">
          <input type="checkbox" name="drinks" defaultChecked={category?.drinks} className="h-4 w-4 accent-[#c9a24a]" />{" "}
          Getränke (mit Menge und Pfand)
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button
            disabled={pending}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {pending ? "Speichern …" : category ? "Kategorie speichern" : "Kategorie anlegen"}
          </button>
          <Message state={state} />
        </div>
      </form>
      {category && (
        <form
          action={delAction}
          className="flex flex-wrap items-center gap-4"
          onSubmit={(e) => !confirm(`Kategorie „${category.title.de}“ löschen?`) && e.preventDefault()}
        >
          <input type="hidden" name="id" value={category.id} />
          <button
            disabled={deleting}
            className="text-xs text-cream/55 underline underline-offset-4 hover:text-[#f0a080]"
          >
            Kategorie löschen
          </button>
          <Message state={delState} />
        </form>
      )}
    </div>
  );
}

/* ---------- dish ---------- */

export function DishForm({
  dish,
  categories,
  categoryId,
}: {
  dish?: Dish;
  categories: { id: string; title: string; drinks: boolean }[];
  categoryId: string;
}) {
  const [state, action, pending] = useActionState(saveDish, null);
  const [delState, delAction, deleting] = useActionState(removeDish, null);
  const drinks = categories.find((c) => c.id === (dish?.categoryId ?? categoryId))?.drinks ?? false;
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-5">
        {dish && <input type="hidden" name="id" value={dish.id} />}
        <ThreeLanguages name="name" title="Name" value={dish?.name} required />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            name="amharic"
            title="Name in Ge'ez-Schrift (optional)"
            value={dish?.amharic}
            maxLength={80}
            lang="am"
          />
          <Field
            name="price"
            title="Preis (€)"
            value={dish ? dish.price.toFixed(2).replace(".", ",") : ""}
            inputMode="decimal"
            placeholder="12,50"
            required
          />
          <label className="flex flex-col gap-1">
            <span className={label}>Kategorie</span>
            <select name="categoryId" defaultValue={dish?.categoryId ?? categoryId} className={field}>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-coal">
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ThreeLanguages name="description" title="Beschreibung" value={dish?.description} area />

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/85">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="orderable"
              defaultChecked={dish?.orderable ?? true}
              className="h-4 w-4 accent-[#c9a24a]"
            />{" "}
            Online bestellbar
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="available"
              defaultChecked={dish?.available ?? true}
              className="h-4 w-4 accent-[#c9a24a]"
            />{" "}
            Verfügbar (nicht ausverkauft)
          </label>
        </div>

        <fieldset>
          <legend className={`${label} mb-1.5`}>Merkmale</legend>
          <div className="flex flex-wrap gap-1.5">
            {DISH_TAGS.map((t) => (
              <label key={t} className={chip}>
                <input
                  type="checkbox"
                  name="tags"
                  value={t}
                  defaultChecked={dish?.tags.includes(t)}
                  className="accent-[#c9a24a]"
                />{" "}
                {TAG_LABEL[t]}
              </label>
            ))}
          </div>
        </fieldset>

        {!drinks && (
          <label className="flex flex-col gap-1 sm:max-w-md">
            <span className={label}>Gluten-Angabe</span>
            <select name="gluten" defaultValue={dish?.gluten ?? "none"} className={field}>
              <option value="none" className="bg-coal">
                Keine Angabe
              </option>
              <option value="noGluten" className="bg-coal">
                „Ohne glutenhaltige Zutaten“
              </option>
              <option value="free" className="bg-coal">
                „Glutenfrei“ (unter 20 mg/kg, auch ohne Spuren)
              </option>
            </select>
          </label>
        )}

        <fieldset>
          <legend className={`${label} mb-1.5`}>Allergene</legend>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((a) => (
              <label key={a.code} className={chip}>
                <input
                  type="checkbox"
                  name="allergens"
                  value={a.code}
                  defaultChecked={dish?.allergens.includes(a.code)}
                  className="accent-[#c9a24a]"
                />
                <span className="font-semibold">{a.code}</span> {a.label.de}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className={`${label} mb-1.5`}>Zusatzstoffe</legend>
          <div className="flex flex-wrap gap-1.5">
            {ADDITIVES.map((a) => (
              <label key={a.code} className={chip}>
                <input
                  type="checkbox"
                  name="additives"
                  value={a.code}
                  defaultChecked={dish?.additives.includes(a.code)}
                  className="accent-[#c9a24a]"
                />
                <span className="font-semibold">{a.code}</span> {a.label.de}
              </label>
            ))}
          </div>
        </fieldset>

        {drinks && (
          <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
            <Field
              name="volume"
              title="Menge (Liter)"
              value={dish?.volume ? String(dish.volume).replace(".", ",") : ""}
              inputMode="decimal"
              placeholder="0,33"
            />
            <Field
              name="deposit"
              title="Pfand (€)"
              value={dish?.deposit ? dish.deposit.toFixed(2).replace(".", ",") : ""}
              inputMode="decimal"
              placeholder="0,25"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            disabled={pending}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {pending ? "Speichern …" : dish ? "Speichern" : "Gericht anlegen"}
          </button>
          <Message state={state} />
        </div>
      </form>
      {dish && (
        <form
          action={delAction}
          className="flex flex-wrap items-center gap-4"
          onSubmit={(e) => !confirm(`„${dish.name.de}“ von der Speisekarte löschen?`) && e.preventDefault()}
        >
          <input type="hidden" name="id" value={dish.id} />
          <button
            disabled={deleting}
            className="text-xs text-cream/55 underline underline-offset-4 hover:text-[#f0a080]"
          >
            Gericht löschen
          </button>
          <Message state={delState} />
        </form>
      )}
    </div>
  );
}
