import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { restaurant } from "@/lib/data";
import { DEFAULT_SETTINGS, LAST_ORDER_BEFORE_CLOSE } from "@/lib/ordering";

export const metadata: Metadata = { title: "Bestellbedingungen" };

const H = ({ children }: { children: React.ReactNode }) => <h2 className="pt-6 font-display text-2xl font-semibold text-gold-soft">{children}</h2>;
const link = "text-gold-soft underline underline-offset-4";

/*
  Terms for online orders and the customer information German law requires before a distance contract
  (§§ 312d, 312g, 312i, 312j BGB, Art. 246a EGBGB). Amounts are only examples; the live values are shown when ordering.
*/
export default function OrderTerms() {
  return (
    <LegalPage title="Bestellbedingungen">
      <p className="font-display text-lg text-cream/80">Bestellbedingungen und Kundeninformationen für Online-Bestellungen</p>

      <H>1. Anbieter</H>
      <p>
        Yetenbi Äthiopisches Restaurant & Café, {restaurant.street}, {restaurant.city}, Telefon{" "}
        <a href={restaurant.phoneHref} className={link}>
          {restaurant.phone}
        </a>
        . Vollständige Angaben im{" "}
        <Link href="/impressum" className={link}>
          Impressum
        </Link>
        .
      </p>

      <H>2. Angebot und Vertragsschluss</H>
      <p>
        Die Speisen und Getränke auf der Bestellseite sind noch kein bindendes Angebot. Mit dem Klick auf „Zahlungspflichtig
        bestellen“ geben Sie eine verbindliche Bestellung ab. Sie erhalten danach eine E-Mail, dass Ihre Bestellung
        eingegangen ist; das ist noch keine Annahme. Der Vertrag kommt zustande, wenn wir die Bestellung annehmen, was wir
        Ihnen per E-Mail und auf der Statusseite mitteilen. Können wir eine Bestellung nicht ausführen, lehnen wir sie ab und
        informieren Sie ebenso.
      </p>
      <p>
        Vor dem Absenden sehen Sie alle gewählten Speisen, Mengen, Lieferart, Uhrzeit und den Gesamtpreis und können Ihre
        Eingaben jederzeit ändern. Zum Bestellen ist ein Kundenkonto nötig. Vertragssprache ist Deutsch; die Bestellseite
        gibt es zusätzlich auf Englisch und Amharisch.
      </p>

      <H>3. Preise, Liefer- und Abholbedingungen</H>
      <p>
        Alle Preise sind Endpreise in Euro einschließlich der gesetzlichen Mehrwertsteuer. Bei Lieferung kommen eine
        Liefergebühr und ein Mindestbestellwert hinzu, die vor der Bestellung angezeigt werden (derzeit in der Regel{" "}
        {DEFAULT_SETTINGS.deliveryFee.toFixed(2).replace(".", ",")} € Liefergebühr, ab{" "}
        {DEFAULT_SETTINGS.freeDeliveryFrom.toFixed(2).replace(".", ",")} € frei, Mindestbestellwert{" "}
        {DEFAULT_SETTINGS.minOrder.toFixed(2).replace(".", ",")} €; maßgeblich sind die Angaben beim Bestellen). Wir liefern
        nur in die beim Bestellen genannten Postleitzahlen.
      </p>
      <p>
        Bestellungen sind während der Öffnungszeiten bis {LAST_ORDER_BEFORE_CLOSE} Minuten vor Schluss möglich, für sofort
        oder eine spätere Uhrzeit am selben Tag. Die angegebene Liefer- oder Abholzeit ist eine Schätzung; wir teilen Ihnen
        bei der Annahme eine voraussichtliche Zeit mit.
      </p>

      <H>4. Bezahlung</H>
      <p>
        Sie bezahlen bei der Übergabe, bar oder mit Karte (Lieferung: beim Fahrer, Abholung: im Restaurant). Auf der Website
        werden keine Zahlungsdaten erfasst.
      </p>

      <H>5. Kein Widerrufsrecht</H>
      <p>
        Für Speisen und Getränke, die wir nach Ihrer Bestellung frisch zubereiten und die schnell verderben können, besteht
        nach § 312g Abs. 2 Nr. 1 und Nr. 2 BGB <strong>kein Widerrufsrecht</strong>. Eine angenommene Bestellung können Sie
        deshalb nicht widerrufen. Möchten Sie etwas ändern oder absagen, rufen Sie uns bitte so früh wie möglich an; solange
        noch nicht gekocht wurde, finden wir fast immer eine Lösung.
      </p>

      <H>6. Mängel und Beschwerden</H>
      <p>
        Es gelten die gesetzlichen Gewährleistungsrechte. Stimmt etwas mit Ihrer Bestellung nicht, melden Sie sich bitte
        gleich telefonisch unter{" "}
        <a href={restaurant.phoneHref} className={link}>
          {restaurant.phone}
        </a>
        , damit wir es schnell klären können.
      </p>

      <H>7. Allergene und Zusatzstoffe</H>
      <p>
        {/* TODO: list the allergens (A–N) per dish on the order page once the kitchen has supplied them (LMIV/LMIDV). */}
        Welche Allergene und Zusatzstoffe ein Gericht enthält, sagen wir Ihnen gerne telefonisch vor der Bestellung. Wir
        bereiten alle Speisen in einer Küche zu; Spuren anderer Allergene können wir nicht ausschließen.
      </p>

      <H>8. Speicherung des Vertragstextes</H>
      <p>
        Wir speichern Ihre Bestellung und senden Ihnen die Einzelheiten per E-Mail. In Ihrem Kundenkonto sehen Sie Ihre
        Bestellungen; die Statusseite bleibt über den Link in der E-Mail erreichbar. Diese Bedingungen können Sie jederzeit
        auf dieser Seite abrufen und ausdrucken.
      </p>

      <H>9. Streitbeilegung</H>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen (§ 36 VSBG).
      </p>

      <p className="pt-6 text-sm text-cream/55">Stand: Oktober 2026</p>
    </LegalPage>
  );
}
