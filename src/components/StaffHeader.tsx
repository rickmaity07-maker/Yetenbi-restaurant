import Link from "next/link";
import { LalibelaCross } from "@/components/heritage/Ornaments";
import { logout } from "@/app/account-actions";
import { ROLE_LABEL } from "@/lib/roles";
import type { User } from "@/lib/server/auth";

/** Title, who is signed in, and the way out, for the kitchen and delivery screens. Owners also get a way back. */
export default function StaffHeader({ title, me }: { title: string; me: User }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold/20 pb-6">
      <div className="flex items-center gap-4">
        <LalibelaCross className="h-8 w-8 text-gold" />
        <div>
          <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">{title}</h1>
          <p className="mt-1 text-sm text-cream/60">
            {me.name} · {ROLE_LABEL[me.role]}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-5 text-sm">
        {me.role === "owner" && (
          <Link href="/admin/bestellungen" className="text-cream/70 underline underline-offset-4 hover:text-cream">
            Verwaltung
          </Link>
        )}
        <Link href="/" className="text-cream/70 underline underline-offset-4 hover:text-cream">
          Zur Website
        </Link>
        <Link href="/datenschutz/team" className="text-cream/70 underline underline-offset-4 hover:text-cream">
          Datenschutz
        </Link>
        <form action={logout}>
          <button className="text-cream/70 underline underline-offset-4 hover:text-cream">Abmelden</button>
        </form>
      </div>
    </div>
  );
}
