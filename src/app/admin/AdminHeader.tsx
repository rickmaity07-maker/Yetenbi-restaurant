import Link from "next/link";
import { LalibelaCross } from "@/components/heritage/Ornaments";
import { logout } from "@/app/account-actions";

/** Title, switch between reservations, orders and team, the staff screens, and the way out. */
export default function AdminHeader({ active }: { active: "reservations" | "orders" | "menu" | "team" | "photos" }) {
  const tab = (on: boolean) => `pb-3 ${on ? "border-b border-gold text-gold-soft" : "text-cream/60 hover:text-cream"}`;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <LalibelaCross className="h-8 w-8 text-gold" />
          <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">Verwaltung</h1>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Link href="/kueche" className="text-cream/70 underline underline-offset-4 hover:text-cream">
            Küche
          </Link>
          <Link href="/lieferung" className="text-cream/70 underline underline-offset-4 hover:text-cream">
            Lieferungen
          </Link>
          <Link href="/" className="text-cream/70 underline underline-offset-4 hover:text-cream">
            Website
          </Link>
          <form action={logout}>
            <button className="text-cream/70 underline underline-offset-4 hover:text-cream">Abmelden</button>
          </form>
        </div>
      </div>
      <nav aria-label="Bereich" className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-b border-gold/20 font-display text-xl">
        <Link href="/admin" className={tab(active === "reservations")}>
          Reservierungen
        </Link>
        <Link href="/admin/bestellungen" className={tab(active === "orders")}>
          Bestellungen
        </Link>
        <Link href="/admin/speisekarte" className={tab(active === "menu")}>
          Speisekarte
        </Link>
        <Link href="/admin/team" className={tab(active === "team")}>
          Team
        </Link>
        <Link href="/admin/fotos" className={tab(active === "photos")}>
          Fotos
        </Link>
      </nav>
    </div>
  );
}
