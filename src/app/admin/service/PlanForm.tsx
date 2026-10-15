"use client";

import { useActionState } from "react";
import { saveTablePlan, type PlanState } from "./actions";

export default function PlanForm({ plan }: { plan: string }) {
  const [state, action, pending] = useActionState<PlanState, FormData>(saveTablePlan, null);
  return (
    <form action={action} className="mt-5 grid gap-4 md:max-w-md">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/60">Ein Tisch pro Zeile</span>
        <textarea
          name="plan"
          defaultValue={plan}
          rows={Math.max(5, plan.split("\n").length + 1)}
          spellCheck={false}
          className="border border-gold/25 bg-ink/40 p-3 font-mono text-sm text-cream focus:border-gold focus:outline-none"
        />
      </label>
      <p className="text-xs text-cream/55">
        Name, optional mit Plätzen: <span className="font-mono text-cream/80">4</span> oder{" "}
        <span className="font-mono text-cream/80">4 | 6</span>. Ein entfernter Tisch verschwindet aus der App; offene
        Rechnungen und die Historie behalten ihn.
      </p>
      <div className="flex items-center gap-4">
        <button
          disabled={pending}
          className="rounded-full bg-gold px-6 py-2.5 font-semibold text-ink disabled:opacity-60"
        >
          {pending ? "Speichere …" : "Tischplan speichern"}
        </button>
        {state?.ok && (
          <p role="status" className="text-sm text-[#7fcf9c]">
            {state.ok}
          </p>
        )}
        {state?.error && (
          <p role="alert" className="text-sm text-[#f0a080]">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
