import BackHomeLink from "./BackHomeLink";
import LegalLinks from "./LegalLinks";

/** Shared shell for the legal pages. The restaurant owner still has to supply the actual legal text. */
export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto min-h-[100dvh] w-full max-w-3xl px-4 py-24 md:py-32">
      <BackHomeLink />
      <h1 className="mt-10 font-display text-5xl font-semibold text-cream md:text-6xl">{title}</h1>
      <div className="mt-8 space-y-4 leading-relaxed text-cream/80">{children}</div>
      <LegalLinks className="mt-16 justify-start border-t border-gold/20 pt-6" />
    </main>
  );
}
