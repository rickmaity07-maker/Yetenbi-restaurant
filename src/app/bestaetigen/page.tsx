import type { Metadata } from "next";
import { Suspense } from "react";
import AccountShell from "@/components/account/AccountShell";
import VerifyView from "./VerifyView";

export const metadata: Metadata = { title: "E-Mail bestätigen", robots: { index: false } };

/** Where the link in the verification email leads. */
export default function VerifyPage() {
  return (
    <AccountShell>
      <Suspense fallback={<div className="h-72" />}>
        <VerifyView />
      </Suspense>
    </AccountShell>
  );
}
