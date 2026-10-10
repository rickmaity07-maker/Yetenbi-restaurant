import { addDays, todayISO } from "./booking";

/* The report period from the address bar (?r=30 or ?von=…&bis=…), shared by the report page and the CSV export. */

export const PRESETS = [
  { key: "7", label: "7 Tage" },
  { key: "30", label: "30 Tage" },
  { key: "monat", label: "Dieser Monat" },
  { key: "vormonat", label: "Letzter Monat" },
  { key: "jahr", label: "Dieses Jahr" },
] as const;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function parseRange(params: Record<string, string | string[] | undefined>) {
  const today = todayISO();
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const von = one("von");
  const bis = one("bis");
  if (ISO.test(von) && ISO.test(bis) && von <= bis && addDays(von, 366) >= bis) return { from: von, to: bis, preset: "eigen" };
  const r = one("r") || "30";
  const [y, m] = today.split("-").map(Number);
  const first = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, "0")}-01`;
  if (r === "7") return { from: addDays(today, -6), to: today, preset: r };
  if (r === "monat") return { from: first(y, m), to: today, preset: r };
  if (r === "vormonat") {
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    return { from: first(py, pm), to: addDays(first(y, m), -1), preset: r };
  }
  if (r === "jahr") return { from: `${y}-01-01`, to: today, preset: r };
  return { from: addDays(today, -29), to: today, preset: "30" };
}

export const rangeQuery = (r: { from: string; to: string }) => `von=${r.from}&bis=${r.to}`;
