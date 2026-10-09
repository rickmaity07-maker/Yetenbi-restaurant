import type { Metadata } from "next";
import { Suspense } from "react";
import AccountShell from "@/components/account/AccountShell";
import StatusView from "./StatusView";

export const metadata: Metadata = { title: "Bestellstatus", robots: { index: false } };

export default function OrderStatusPage() {
  return (
    <AccountShell>
      {/* reads ?r= and ?t= from the link */}
      <Suspense fallback={<div className="h-80" />}>
        <StatusView />
      </Suspense>
    </AccountShell>
  );
}
