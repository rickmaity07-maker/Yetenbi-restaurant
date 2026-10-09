import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LalibelaCross } from "@/components/heritage/Ornaments";
import type { Locale } from "@/lib/i18n";
import { checkCancelSignature } from "@/lib/server/cancel-token";
import { notifyRestaurantCancelled } from "@/lib/server/mailer";
import { cancelByReference, findByReference } from "@/lib/server/reservations";

export const metadata: Metadata = { title: "Reservierung stornieren", robots: { index: false } };

/* Text in the language the guest booked in. */
const copy: Record<Locale, { title: string; lead: string; button: string; done: string; invalid: string; closed: string; home: string; dateLocale: string }> = {
  de: {
    title: "Reservierung stornieren",
    lead: "Möchtet ihr diese Reservierung wirklich stornieren?",
    button: "Ja, stornieren",
    done: "Die Reservierung ist storniert. Danke, dass ihr Bescheid gegeben habt.",
    invalid: "Dieser Link ist ungültig.",
    closed: "Diese Reservierung kann nicht mehr storniert werden. Ruft uns gerne an: 0176 21438960.",
    home: "Zur Startseite",
    dateLocale: "de-DE",
  },
  en: {
    title: "Cancel reservation",
    lead: "Do you really want to cancel this reservation?",
    button: "Yes, cancel",
    done: "Your reservation is cancelled. Thank you for letting us know.",
    invalid: "This link is not valid.",
    closed: "This reservation can no longer be cancelled. Please call us: 0176 21438960.",
    home: "Back to the homepage",
    dateLocale: "en-GB",
  },
  am: {
    title: "ቦታ ማስያዣ ሰርዝ",
    lead: "ይህን ቦታ ማስያዣ መሰረዝ ይፈልጋሉ?",
    button: "አዎ፣ ሰርዝ",
    done: "ቦታ ማስያዣዎ ተሰርዟል። ስላሳወቁን እናመሰግናለን።",
    invalid: "ይህ ሊንክ ትክክል አይደለም።",
    closed: "ይህ ቦታ ማስያዣ ከእንግዲህ ሊሰረዝ አይችልም። እባክዎ ይደውሉ፦ 0176 21438960።",
    home: "ወደ መነሻ ገጽ",
    dateLocale: "am-ET",
  },
};

async function cancelViaLink(form: FormData) {
  "use server";
  const reference = String(form.get("r") ?? "");
  const signature = String(form.get("s") ?? "");
  if (!checkCancelSignature(reference, signature)) redirect("/stornieren");
  const reservation = await cancelByReference(reference);
  if (reservation) await notifyRestaurantCancelled(reservation);
  redirect(`/stornieren?r=${encodeURIComponent(reference)}&s=${signature}&done=1`);
}

async function CancelContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const reference = String(params.r ?? "");
  const signature = String(params.s ?? "");
  const valid = reference && signature && checkCancelSignature(reference, signature);
  const reservation = valid ? await findByReference(reference) : null;
  const c = copy[reservation?.locale ?? "de"];

  if (!reservation) return <p className="mt-6 font-display text-2xl italic text-cream/80">{copy.de.invalid}</p>;

  const when = new Date(`${reservation.date}T12:00:00Z`).toLocaleDateString(c.dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const cancellable = reservation.status === "pending" || reservation.status === "confirmed";

  return (
    <div lang={reservation.locale}>
      <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">{c.title}</h1>
      <div className="mt-8 border border-gold/25 bg-ink/40 p-5">
        <p className="font-display text-2xl text-cream">
          {when}, {reservation.time}
        </p>
        <p className="mt-1 text-cream/70">
          {reservation.name} · {reservation.guests} · {reservation.reference}
        </p>
      </div>
      {params.done || reservation.status === "cancelled" ? (
        <p className="mt-8 font-display text-2xl italic text-cream/85">{c.done}</p>
      ) : cancellable ? (
        <form action={cancelViaLink} className="mt-8">
          <p className="font-display text-xl italic text-cream/80">{c.lead}</p>
          <input type="hidden" name="r" value={reference} />
          <input type="hidden" name="s" value={signature} />
          <button className="mt-6 rounded-full border border-[#f0a080]/60 px-7 py-3 font-semibold text-[#f0a080] hover:bg-[#f0a080] hover:text-ink">
            {c.button}
          </button>
        </form>
      ) : (
        <p className="mt-8 font-display text-xl italic text-cream/80">{c.closed}</p>
      )}
      <Link href="/" className="mt-10 inline-block text-sm text-gold-soft underline underline-offset-4">
        {c.home}
      </Link>
    </div>
  );
}

export default function CancelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <main id="main" className="mx-auto min-h-[100dvh] max-w-xl px-5 py-24">
      <LalibelaCross className="h-9 w-9 text-gold" />
      <Suspense fallback={<div className="h-72" />}>
        <CancelContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
