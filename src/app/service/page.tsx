import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import StaffHeader from "@/components/StaffHeader";
import { latestRelease } from "@/lib/server/app-releases";
import { requireRole } from "@/lib/server/auth";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Service-App | Yetenbi", robots: { index: false, follow: false } };

/** The service team's page on the website: get the app onto a phone or tablet. Taking orders happens in the app. */
async function Download() {
  await connection();
  const me = await requireRole(["service", "owner"], "/service");
  const release = await latestRelease();
  return (
    <>
      <StaffHeader title="Service-App" me={me} />
      <section className="mt-10 max-w-2xl">
        <p className="text-lg text-cream/80">
          Bestellungen am Tisch nehmt ihr in der Yetenbi-Service-App auf – auf dem Handy oder dem Tablet. Anmelden mit
          derselben E-Mail und demselben Passwort wie hier.
        </p>
        {release ? (
          <>
            <a href="/app" className="mt-8 inline-block rounded-full bg-gold px-8 py-4 text-lg font-semibold text-ink">
              App herunterladen (Version {release.versionName})
            </a>
            <p className="mt-4 text-sm text-cream/60">
              Oder direkt auf dem Gerät eingeben:{" "}
              <span className="font-mono text-cream">{siteUrl().replace(/^https?:\/\//, "")}/app</span>
            </p>
          </>
        ) : (
          <p className="mt-8 text-cream/60">Die App ist noch nicht veröffentlicht.</p>
        )}
        <ol className="mt-10 list-decimal space-y-3 pl-5 text-cream/75">
          <li>Diese Seite auf dem Android-Gerät öffnen und auf „App herunterladen“ tippen.</li>
          <li>Die geladene Datei öffnen. Android fragt einmal, ob der Browser Apps installieren darf: erlauben.</li>
          <li>
            Installieren, öffnen, anmelden. Benachrichtigungen erlauben, damit „Essen fertig“ und Updates ankommen.
          </li>
          <li>Neue Versionen meldet die App selbst; ein Tipp auf „Installieren“ genügt.</li>
        </ol>
      </section>
    </>
  );
}

export default function ServicePage() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-16">
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade …</p>}>
        <Download />
      </Suspense>
    </main>
  );
}
