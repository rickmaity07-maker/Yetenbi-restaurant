// Interface text in German (default), English and Amharic. The menu's own texts are in the database.
import { am } from "./am";
import { de, type Dict } from "./de";
import { en } from "./en";

export const LOCALES = ["de", "en", "am"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";

export type { Dict };
export const content: Record<Locale, Dict> = { de, en, am };
