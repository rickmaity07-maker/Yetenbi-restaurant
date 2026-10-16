"use client";

import { useActionState } from "react";
import { addStaff, resetStaffPassword, setStaffPin, type TeamState } from "./actions";

const field =
  "w-full border-0 border-b border-gold/30 bg-transparent px-0 pb-2 pt-1 text-base text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none [color-scheme:dark]";
const label = "text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold";

function Message({ state }: { state: TeamState }) {
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

export function AddStaffForm() {
  const [state, action, pending] = useActionState(addStaff, null);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className={label}>Name</span>
        <input name="name" maxLength={80} className={field} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>E-Mail (Login)</span>
        <input name="email" type="email" required autoComplete="off" className={field} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Telefon (optional)</span>
        <input name="phone" type="tel" className={field} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Rolle</span>
        <select name="role" defaultValue="kitchen" className={field}>
          <option value="kitchen" className="bg-coal">
            Küche – sieht nur das Essen
          </option>
          <option value="service" className="bg-coal">
            Service – nimmt Bestellungen in der App auf
          </option>
          <option value="driver" className="bg-coal">
            Lieferung – sieht eigene Lieferungen
          </option>
          <option value="owner" className="bg-coal">
            Verwaltung – sieht alles
          </option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className={label}>Startpasswort (mind. 10 Zeichen)</span>
        <input name="password" type="text" minLength={10} autoComplete="new-password" className={field} />
      </label>
      <p className="text-xs text-cream/55 sm:col-span-2">
        Hat die Person schon ein Gast-Konto mit dieser E-Mail, bekommt es nur die Rolle; Name und Passwort bleiben dann
        leer.
      </p>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button
          disabled={pending}
          className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {pending ? "Speichern …" : "Konto anlegen"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: number }) {
  const [state, action, pending] = useActionState(resetStaffPassword, null);
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <input
        name="password"
        type="text"
        minLength={10}
        placeholder="Neues Passwort"
        aria-label="Neues Passwort"
        autoComplete="new-password"
        className={`${field} max-w-xs text-sm`}
      />
      <button
        disabled={pending}
        className="rounded-full border border-cream/30 px-4 py-1.5 text-xs font-semibold text-cream hover:border-gold disabled:opacity-60"
      >
        Setzen
      </button>
      <div className="basis-full">
        <Message state={state} />
      </div>
    </form>
  );
}

/** The PIN for "Wer bedient?" in the service app: on a shared phone, tap your name and type the PIN. */
export function PinForm({ id, hasPin }: { id: number; hasPin: boolean }) {
  const [state, action, pending] = useActionState(setStaffPin, null);
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <input
        name="pin"
        inputMode="numeric"
        maxLength={6}
        placeholder={hasPin ? "Neue PIN" : "PIN (4–6 Ziffern)"}
        aria-label="App-PIN"
        autoComplete="off"
        className={`${field} max-w-[10rem] text-sm`}
      />
      <button
        disabled={pending}
        className="rounded-full border border-cream/30 px-4 py-1.5 text-xs font-semibold text-cream hover:border-gold disabled:opacity-60"
      >
        Setzen
      </button>
      {hasPin && (
        <button
          name="remove"
          value="1"
          disabled={pending}
          className="rounded-full border border-[#f0a080]/60 px-4 py-1.5 text-xs font-semibold text-[#f0a080] disabled:opacity-60"
        >
          Entfernen
        </button>
      )}
      <div className="basis-full">
        <Message state={state} />
      </div>
    </form>
  );
}
