import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Verwaltung", robots: { index: false, follow: false } };

/** Every /admin page sits in the shell: sidebar by task, live counters and alerts, account. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
