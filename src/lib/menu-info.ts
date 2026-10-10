import { menu, type L, type MenuItem, type Tag } from "./data";

/*
  Food information the owner enters in /admin → Speisekarte (stored in Neon, not in the code):
  allergens (LMIV Annex II, letters A–N as usual in Germany), additives that must be named for loose food (LMIDV),
  drink volume (for the price per litre, PAngV), deposit (Pfand, shown and charged separately) and the gluten claim.
*/

export const ALLERGENS: { code: string; label: L }[] = [
  { code: "A", label: { de: "Glutenhaltiges Getreide", en: "Cereals containing gluten", am: "ግሉተን ያለው እህል" } },
  { code: "B", label: { de: "Krebstiere", en: "Crustaceans", am: "ክራስቴሽያን" } },
  { code: "C", label: { de: "Eier", en: "Eggs", am: "እንቁላል" } },
  { code: "D", label: { de: "Fisch", en: "Fish", am: "ዓሣ" } },
  { code: "E", label: { de: "Erdnüsse", en: "Peanuts", am: "ኦቾሎኒ" } },
  { code: "F", label: { de: "Soja", en: "Soy", am: "አኩሪ አተር" } },
  { code: "G", label: { de: "Milch (inkl. Laktose)", en: "Milk (incl. lactose)", am: "ወተት" } },
  { code: "H", label: { de: "Schalenfrüchte (Nüsse)", en: "Tree nuts", am: "ለውዝ" } },
  { code: "I", label: { de: "Sellerie", en: "Celery", am: "ሴሌሪ" } },
  { code: "J", label: { de: "Senf", en: "Mustard", am: "ሰናፍጭ" } },
  { code: "K", label: { de: "Sesam", en: "Sesame", am: "ሰሊጥ" } },
  { code: "L", label: { de: "Schwefeldioxid / Sulfite", en: "Sulphur dioxide / sulphites", am: "ሰልፋይት" } },
  { code: "M", label: { de: "Lupinen", en: "Lupin", am: "ሉፒን" } },
  { code: "N", label: { de: "Weichtiere", en: "Molluscs", am: "ሞለስክ" } },
];

export const ADDITIVES: { code: number; label: L }[] = [
  { code: 1, label: { de: "mit Farbstoff", en: "with colouring", am: "ቀለም ያለው" } },
  { code: 2, label: { de: "mit Konservierungsstoff", en: "with preservative", am: "ማቆያ ያለው" } },
  { code: 3, label: { de: "mit Antioxidationsmittel", en: "with antioxidant", am: "አንቲኦክሲዳንት ያለው" } },
  { code: 4, label: { de: "mit Geschmacksverstärker", en: "with flavour enhancer", am: "ጣዕም አሻሻይ ያለው" } },
  { code: 5, label: { de: "geschwefelt", en: "sulphured", am: "ሰልፈር የተደረገበት" } },
  { code: 6, label: { de: "geschwärzt", en: "blackened", am: "የጠቆረ" } },
  { code: 7, label: { de: "gewachst", en: "waxed", am: "ሰም የተቀባ" } },
  { code: 8, label: { de: "mit Phosphat", en: "with phosphate", am: "ፎስፌት ያለው" } },
  { code: 9, label: { de: "mit Süßungsmittel", en: "with sweetener", am: "ጣፋጭ ማድረጊያ ያለው" } },
  { code: 10, label: { de: "enthält eine Phenylalaninquelle", en: "contains a source of phenylalanine", am: "ፌኒላላኒን ያለው" } },
  { code: 11, label: { de: "koffeinhaltig", en: "contains caffeine", am: "ካፌይን ያለው" } },
  { code: 12, label: { de: "chininhaltig", en: "contains quinine", am: "ኪኒን ያለው" } },
];

/** How a dish's gluten line reads: keep the menu's tag, "gluten-free", "no gluten-containing ingredients", or nothing. */
export type GlutenClaim = "keep" | "free" | "noGluten" | "none";

export type ItemInfo = { allergens: string[]; additives: number[]; volume: number | null; deposit: number; gluten: GlutenClaim };
export type MenuInfo = Record<string, ItemInfo>;

export const EMPTY_INFO: ItemInfo = { allergens: [], additives: [], volume: null, deposit: 0, gluten: "keep" };

/** Drink categories get volume and deposit fields; the others the gluten choice. */
export const DRINK_CATEGORIES = new Set(["kaffee", "heiss", "kalt"]);

/** Every item on the menu with a stable id (the same ids the order page uses). */
export const ALL_ITEMS = menu.flatMap((c) => c.items.map((item, i) => ({ id: `${c.id}-${i}`, categoryId: c.id, item })));

export const infoOf = (info: MenuInfo | undefined, id: string): ItemInfo => ({ ...EMPTY_INFO, ...(info?.[id] ?? {}) });

/** The tags to show, with the gluten claim the owner chose. */
export function tagsFor(item: Pick<MenuItem, "tags">, info: ItemInfo): (Tag | "noGluten")[] {
  const base = (item.tags ?? []).filter((t) => t !== "glutenfree");
  const hadClaim = item.tags?.includes("glutenfree") ?? false;
  const claim = info.gluten === "keep" ? (hadClaim ? "free" : "none") : info.gluten;
  return claim === "free" ? [...base, "glutenfree"] : claim === "noGluten" ? [...base, "noGluten"] : base;
}

/** Whether the owner has entered any allergen or additive information at all (switches the menu's note). */
export const hasAllergenData = (info: MenuInfo) => Object.values(info).some((i) => i.allergens?.length || i.additives?.length);
