import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { restaurant } from "@/lib/data";
import { formatEuro } from "@/lib/ordering";
import { getBusiness } from "@/lib/server/business";
import { hasDatabase } from "@/lib/server/db";
import { checkByReceipt } from "@/lib/server/service";

export const metadata: Metadata = {
  title: "Ihre Rechnung | Yetenbi",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }> };

const euro = (amount: number) => formatEuro(amount, "de-DE");
const METHOD = { cash: "Bar · cash", card: "Karte · card" } as const;

/*
  The guest's copy of a paid bill, opened from the QR code the waiter shows in the app (or a link sent to them).
  The link is a long random token, so it can't be guessed; it shows nothing about the guest.
*/
async function Receipt({ params }: Props) {
  await connection();
  if (!hasDatabase()) notFound();
  const check = await checkByReceipt((await params).token);
  if (!check) notFound();
  const business = await getBusiness();
  const items = check.items.filter((item) => item.status !== "void");
  const when = new Date(check.closedAt ?? check.openedAt).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  });
  return (
    <article className="mx-auto max-w-md border border-gold/25 bg-ink/50 p-6 md:p-8">
      <header className="text-center">
        <p className="font-display text-4xl text-gold-soft">{restaurant.name}</p>
        <p className="mt-1 text-sm text-cream/65">
          {restaurant.street} · {restaurant.city}
          <br />
          {restaurant.phone}
        </p>
      </header>
      <p className="mt-6 flex justify-between border-y border-gold/15 py-2 text-sm text-cream/70">
        <span>
          Tisch {check.tableLabel} · Nr. {check.number}
        </span>
        <span>{when}</span>
      </p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3 text-cream">
            <span className="w-8 shrink-0 tabular-nums text-cream/70">{item.qty}×</span>
            <span className="flex-1">
              {item.name.de}
              {item.qty > 1 && <span className="block text-xs text-cream/50">je {euro(item.unit)}</span>}
            </span>
            <span className="tabular-nums">{euro(item.unit * item.qty)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-5 space-y-1 border-t border-gold/15 pt-4 text-cream">
        <div className="flex justify-between font-display text-2xl">
          <dt>Summe · Total</dt>
          <dd className="tabular-nums">{euro(check.total)}</dd>
        </div>
        {check.tip > 0 && (
          <div className="flex justify-between text-sm text-cream/70">
            <dt>Trinkgeld · Tip</dt>
            <dd className="tabular-nums">{euro(check.tip)}</dd>
          </div>
        )}
      </dl>
      <ul className="mt-4 space-y-1 text-sm text-cream/70">
        {check.payments.map((payment) => (
          <li key={payment.id} className="flex justify-between">
            <span>
              {METHOD[payment.method]}
              {payment.label && ` · ${payment.label}`}
            </span>
            <span className="tabular-nums">{euro(payment.amount + payment.tip)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs leading-relaxed text-cream/55">
        Alle Preise inklusive Mehrwertsteuer.
        {business.vatId && ` USt-IdNr. ${business.vatId}.`} Eine Rechnung mit ausgewiesener Steuer (z. B. für
        Bewirtungskosten) bekommen Sie gern bei uns im Restaurant.
        <br />
        All prices include VAT. Ask us for a tax invoice.
      </p>
      <p className="mt-6 text-center font-display text-xl italic text-gold-soft">
        Amesegnalehu – danke für Ihren Besuch!
      </p>
    </article>
  );
}

export default function ReceiptPage(props: Props) {
  return (
    <main id="main" className="px-4 py-10 md:py-16">
      <Suspense fallback={<p className="text-center text-cream/60">Lade Rechnung …</p>}>
        <Receipt {...props} />
      </Suspense>
    </main>
  );
}
