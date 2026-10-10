"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { OrderSettings } from "@/lib/ordering";
import { addPhoneBlock, saveSettings } from "../order-actions";

/** Re-fetches the board every 20 seconds so new orders appear without reloading. */
export function LiveRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

const field = "w-full border-0 border-b border-gold/30 bg-transparent px-0 pb-2 pt-1 text-base text-cream focus:border-gold focus:outline-none";
const label = "text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold";

export function SettingsForm({ settings }: { settings: OrderSettings }) {
  const [state, action, pending] = useActionState(saveSettings, null);
  const box = "flex items-center gap-3 text-cream/90";
  return (
    <form action={action} className="space-y-6">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <label className={box}>
          <input type="checkbox" name="paused" defaultChecked={settings.paused} className="h-4 w-4 accent-[#c9a24a]" /> Online-Bestellungen pausieren
        </label>
        <label className={box}>
          <input type="checkbox" name="delivery" defaultChecked={settings.delivery} className="h-4 w-4 accent-[#c9a24a]" /> Lieferung
        </label>
        <label className={box}>
          <input type="checkbox" name="pickup" defaultChecked={settings.pickup} className="h-4 w-4 accent-[#c9a24a]" /> Abholung
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {(
          [
            ["minOrder", "Mindestbestellwert (€)", settings.minOrder],
            ["deliveryFee", "Liefergebühr (€)", settings.deliveryFee],
            ["freeDeliveryFrom", "Gratis-Lieferung ab (€, 0 = nie)", settings.freeDeliveryFrom],
            ["deliveryMinutes", "Lieferzeit (Min.)", settings.deliveryMinutes],
            ["pickupMinutes", "Abholzeit (Min.)", settings.pickupMinutes],
          ] as const
        ).map(([name, title, value]) => (
          <label key={name} className="flex flex-col gap-1.5">
            <span className={label}>{title}</span>
            <input name={name} inputMode="decimal" defaultValue={String(value).replace(".", ",")} className={field} />
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Liefergebiet (Postleitzahlen, mit Komma getrennt)</span>
        <input name="postcodes" defaultValue={settings.postcodes.join(", ")} className={field} />
      </label>
      <div className="flex items-center gap-4">
        <button disabled={pending} className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink disabled:opacity-60">
          {pending ? "Speichern …" : "Einstellungen speichern"}
        </button>
        {state?.ok && <p role="status" className="text-sm text-[#9fe0b6]">{state.ok}</p>}
        {state?.error && <p role="alert" className="text-sm text-[#f0a080]">{state.error}</p>}
      </div>
    </form>
  );
}

/** Blocks a phone number by hand, e.g. after prank calls. */
export function AddBlockForm() {
  const [state, action, pending] = useActionState(addPhoneBlock, null);
  return (
    <form action={action} className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="flex flex-col gap-1.5">
        <span className={label}>Telefonnummer sperren</span>
        <input name="phone" inputMode="tel" required className={field} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Grund (intern)</span>
        <input name="reason" maxLength={300} className={field} />
      </label>
      <button disabled={pending} className="rounded-full border border-[#f0a080]/70 px-5 py-2.5 text-sm font-semibold text-[#f0a080] disabled:opacity-60">
        Sperren
      </button>
      {state?.ok && <p role="status" className="text-sm text-[#9fe0b6] sm:col-span-3">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-sm text-[#f0a080] sm:col-span-3">{state.error}</p>}
    </form>
  );
}
