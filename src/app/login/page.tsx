import type { Metadata } from "next";
import { Suspense } from "react";
import AccountShell from "@/components/account/AccountShell";
import LoginView from "./LoginView";
import { isGoogleConfigured } from "@/lib/server/google";

export const metadata: Metadata = { title: "Anmelden", robots: { index: false } };

export default function LoginPage() {
  return (
    <AccountShell>
      {/* reads ?next= and ?mode= from the URL, so it renders in the browser */}
      <Suspense fallback={<div className="h-96" />}>
        <LoginView googleEnabled={isGoogleConfigured()} />
      </Suspense>
    </AccountShell>
  );
}
