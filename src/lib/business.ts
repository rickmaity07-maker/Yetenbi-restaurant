import { WEEK, type DayHours } from "./hours";

/*
  What the owner edits in /admin → Betrieb & Rechtliches (stored in Neon, key "business"): the opening hours
  used everywhere (hours table, reservation times, order times, search engines) and the legal details shown in
  the Impressum, the privacy policy and the ordering terms. Address and phone stay in lib/data.ts.
*/

export type Business = {
  hours: DayHours[]; // Monday first
  ownerName: string;
  contactEmail: string;
  vatId: string;
};

export const DEFAULT_BUSINESS: Business = { hours: WEEK, ownerName: "", contactEmail: "", vatId: "" };

export const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

/** Whether the Impressum still lacks what § 5 DDG requires (owner's name and an email address). */
export const impressumMissing = (b: Business) => !b.ownerName.trim() || !b.contactEmail.trim();
