"use client";

import { useActionState } from "react";
import { addClosedDay, addPhoneBooking, type AdminState } from "./actions";

const field =
  "w-full border-0 border-b border-gold/30 bg-transparent px-0 pb-2 pt-1 text-base text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none [color-scheme:dark]";
const label = "text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold";

function Message({ state }: { state: AdminState }) {
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

function Input({
  name,
  title,
  ...rest
}: { name: string; title: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={label}>{title}</span>
      <input name={name} className={field} {...rest} />
    </label>
  );
}

export function PhoneBookingForm() {
  const [state, action, pending] = useActionState(addPhoneBooking, null);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Input name="date" title="Datum" type="date" required />
      <Input name="time" title="Uhrzeit" type="time" step={1800} required />
      <Input name="guests" title="Personen" type="number" min={1} max={12} defaultValue={2} required />
      <Input name="name" title="Name" required />
      <Input name="phone" title="Telefon" type="tel" required />
      <Input name="email" title="E-Mail (optional)" type="email" />
      <div className="sm:col-span-2 lg:col-span-3">
        <Input name="note" title="Anmerkung (optional)" maxLength={280} />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
        <button
          disabled={pending}
          className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {pending ? "Speichern …" : "Reservierung eintragen"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function ClosedDayForm() {
  const [state, action, pending] = useActionState(addClosedDay, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-5">
      <div className="w-44">
        <Input name="date" title="Datum" type="date" required />
      </div>
      <div className="min-w-48 flex-1">
        <Input
          name="note"
          title="Grund (optional, auf der Website sichtbar – keine Namen)"
          placeholder="z. B. Feiertag, geschlossene Gesellschaft"
        />
      </div>
      <button
        disabled={pending}
        className="rounded-full border border-gold/60 px-5 py-2.5 text-sm font-semibold text-gold-soft hover:bg-gold hover:text-ink disabled:opacity-60"
      >
        Schließen
      </button>
      <div className="basis-full">
        <Message state={state} />
      </div>
    </form>
  );
}
