"use server";

import { revalidatePath } from "next/cache";
import { setReleaseFlags } from "@/lib/server/app-releases";
import { audit } from "@/lib/server/audit";
import { requireOwner } from "@/lib/server/auth";
import { saveTables } from "@/lib/server/service";

export type PlanState = { ok?: string; error?: string } | null;

/**
  The table plan, one table per line: "4" or "4 | 6" (name | seats). Order of the lines = order in the app.
  Names may repeat only once; 1–60 tables.
*/
export async function saveTablePlan(_: PlanState, form: FormData): Promise<PlanState> {
  const me = await requireOwner();
  const lines = String(form.get("plan") ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0 || lines.length > 60) return { error: "Bitte 1 bis 60 Tische eintragen, einen pro Zeile." };
  const plan: { label: string; area: string; seats: number }[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const [rawLabel, rawSeats] = line.split("|").map((part) => part.trim());
    const label = rawLabel.slice(0, 24);
    const seats = rawSeats ? Number(rawSeats) : 4;
    if (!label) return { error: `„${line}“: Name fehlt.` };
    if (!Number.isInteger(seats) || seats < 1 || seats > 40) return { error: `„${line}“: Plätze 1 bis 40.` };
    if (seen.has(label.toLowerCase())) return { error: `Tisch „${label}“ steht doppelt in der Liste.` };
    seen.add(label.toLowerCase());
    plan.push({ label, area: "", seats });
  }
  await saveTables(me, plan);
  revalidatePath("/admin/service");
  return { ok: `Gespeichert: ${plan.length} Tische. Die App übernimmt sie innerhalb einer halben Minute.` };
}

/** Switch a version on or off for the devices, or make it mandatory. */
export async function releaseFlag(form: FormData) {
  const me = await requireOwner();
  const id = Number(form.get("id"));
  const flag = String(form.get("flag"));
  const value = form.get("value") === "1";
  if (!Number.isInteger(id) || (flag !== "published" && flag !== "mandatory")) return;
  await setReleaseFlags(id, { [flag]: value });
  await audit(
    me,
    "service",
    flag === "published"
      ? value
        ? "App-Version freigegeben"
        : "App-Version zurückgezogen"
      : value
        ? "App-Update verpflichtend"
        : "App-Update freiwillig",
    String(form.get("name") ?? ""),
  );
  revalidatePath("/admin/service");
}
