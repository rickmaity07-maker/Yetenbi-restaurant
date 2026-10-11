"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { resetPassword } from "@/app/account-actions";
import { useLanguage } from "@/lib/language";
import { AuthField, FormMessage, SubmitButton } from "@/components/account/AccountShell";

export default function ResetView() {
  const { t } = useLanguage();
  const text = t.account;
  const token = useSearchParams().get("token") ?? "";
  const [state, action, pending] = useActionState(resetPassword, null);
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">{text.newPassword}</h1>
      <form action={action} className="mt-10 space-y-8">
        <input type="hidden" name="token" value={token} />
        <AuthField
          id="password"
          label={text.newPassword}
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          hint={text.passwordHint}
        />
        <FormMessage error={state?.error && text.errors[state.error]} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SubmitButton pending={pending}>{text.savePassword}</SubmitButton>
          <Link href="/login" className="text-sm text-cream/70 underline decoration-gold/40 underline-offset-4">
            {text.back}
          </Link>
        </div>
      </form>
    </div>
  );
}
