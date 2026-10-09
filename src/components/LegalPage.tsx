import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

/** Shared shell for the legal pages. The restaurant owner still has to supply the actual legal text. */
export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto min-h-[100dvh] w-full max-w-3xl px-4 py-24 md:py-32">
      <Link href="/" className="group inline-flex items-center gap-2 text-sm text-gold-soft">
        <ArrowLeft size={16} className="transition-transform duration-500 group-hover:-translate-x-1" />
        Zurück zur Startseite
      </Link>
      <h1 className="mt-10 font-display text-5xl font-semibold text-cream md:text-6xl">{title}</h1>
      <div className="mt-8 space-y-4 leading-relaxed text-cream/80">{children}</div>
    </main>
  );
}
