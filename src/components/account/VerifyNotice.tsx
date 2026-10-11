"use client";

import { useActionState } from "react";
import { resendVerification } from "@/app/account-actions";
import { useLanguage } from "@/lib/language";

/** Reminds a guest to confirm their email address, with a button to send the link again. */
export default function VerifyNotice({ email }: { email: string }) {
  const { t } = useLanguage();
  const text = t.account;
  const [state, action, pending] = useActionState(resendVerification, null);
  return (
    <form action={action} className="border border-[#f0a080]/50 bg-[#f0a080]/[0.06] p-5 text-sm text-cream/85">
      <p>{text.verifyNotice(email)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          disabled={pending || state?.ok}
          className="rounded-full border border-cream/30 px-4 py-1.5 font-semibold text-cream hover:border-gold disabled:opacity-50"
        >
          {text.verifyResend}
        </button>
        {state?.ok && (
          <span role="status" className="text-[#9fe0b6]">
            {text.verifySent}
          </span>
        )}
        {state?.error && (
          <span role="alert" className="text-[#f0a080]">
            {text.errors[state.error]}
          </span>
        )}
      </div>
    </form>
  );
}
