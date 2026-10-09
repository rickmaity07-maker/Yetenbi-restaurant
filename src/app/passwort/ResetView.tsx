"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { resetPassword } from "@/app/account-actions";
import { useLanguage } from "@/lib/language";
import { AuthField, FormMessage, SubmitButton } from "@/components/account/AccountShell";

export default function ResetView() {
  const { t } = useLanguage();
  const a = t.account;
  const token = useSearchParams().get("token") ?? "";
  const [state, action, pending] = useActionState(resetPassword, null);
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">{a.newPassword}</h1>
      <form action={action} className="mt-10 space-y-8">
        <input type="hidden" name="token" value={token} />
        <AuthField id="password" label={a.newPassword} type="password" autoComplete="new-password" minLength={8} required hint={a.passwordHint} />
        <FormMessage error={state?.error && a.errors[state.error]} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SubmitButton pending={pending}>{a.savePassword}</SubmitButton>
          <Link href="/login" className="text-sm text-cream/70 underline decoration-gold/40 underline-offset-4">
            {a.back}
          </Link>
        </div>
      </form>
    </div>
  );
}
