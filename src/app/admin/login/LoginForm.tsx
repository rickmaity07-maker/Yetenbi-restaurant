"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-10 space-y-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-describedby={state?.error ? "pw-error" : undefined}
          className="w-full border-0 border-b border-gold/40 bg-transparent px-0 pb-3 pt-1 font-display text-2xl text-cream focus:border-gold focus:outline-none"
        />
        {state?.error && (
          <p id="pw-error" className="text-sm text-[#f0a080]">
            {state.error}
          </p>
        )}
      </div>
      <button type="submit" disabled={pending} className="rounded-full bg-gold px-8 py-3.5 font-semibold text-ink transition-opacity disabled:opacity-60">
        {pending ? "Anmelden …" : "Anmelden"}
      </button>
    </form>
  );
}
