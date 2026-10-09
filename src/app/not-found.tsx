import Link from "next/link";
import { LalibelaCross } from "@/components/heritage/Ornaments";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <LalibelaCross className="h-10 w-10 text-gold" />
      <p className="mt-8 font-ethiopic text-xl text-gold/85" lang="am">
        ይቅርታ
      </p>
      <h1 className="mt-2 font-display text-5xl font-semibold text-cream md:text-6xl">Diese Seite gibt es nicht.</h1>
      <p className="mt-4 font-display text-xl italic text-cream/75">This page doesn&apos;t exist. Die Platte steht aber noch auf dem Tisch.</p>
      <Link href="/" className="mt-10 rounded-full bg-gold px-8 py-4 font-semibold text-ink">
        Zur Startseite
      </Link>
    </main>
  );
}
