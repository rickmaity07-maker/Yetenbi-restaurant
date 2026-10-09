import type { Metadata } from "next";
import { Suspense } from "react";
import AccountShell from "@/components/account/AccountShell";
import ResetView from "./ResetView";

export const metadata: Metadata = { title: "Neues Passwort", robots: { index: false } };

export default function ResetPage() {
  return (
    <AccountShell>
      <Suspense fallback={<div className="h-72" />}>
        <ResetView />
      </Suspense>
    </AccountShell>
  );
}
