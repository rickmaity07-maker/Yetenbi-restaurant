import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { restaurant } from "@/lib/data";

export const metadata: Metadata = { title: "Datenschutz" };

const H = ({ children }: { children: React.ReactNode }) => <h2 className="pt-6 font-display text-2xl font-semibold text-gold-soft">{children}</h2>;

// TODO: Fill in the owner's name (Verantwortlicher) and have the text checked before going live.
export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutz">
      <p>Wir freuen uns über Ihren Besuch. Hier erklären wir, welche Daten diese Website verarbeitet und wofür.</p>

      <H>1. Verantwortlicher</H>
      <p>
        Yetenbi Äthiopisches Restaurant & Café, Inhaber/in: <strong>[Name wird ergänzt]</strong>
        <br />
        {restaurant.street}, {restaurant.city}
        <br />
        Telefon: {restaurant.phone}
      </p>

      <H>2. Hosting und Server-Protokolle</H>
      <p>
        Die Website wird bei Vercel Inc. (USA) gehostet. Beim Aufruf werden technisch notwendige Daten verarbeitet
        (IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browser), um die Seite auszuliefern und vor Missbrauch zu
        schützen (Art. 6 Abs. 1 lit. f DSGVO). Vercel ist nach dem EU-US Data Privacy Framework zertifiziert; zusätzlich
        gelten Standardvertragsklauseln.
      </p>

      <H>3. Tischreservierung</H>
      <p>
        Wenn Sie über das Formular einen Tisch anfragen, verarbeiten wir Name, E-Mail-Adresse, Telefonnummer, Datum,
        Uhrzeit, Personenzahl und Ihre optionale Anmerkung, um die Reservierung durchzuführen und Sie zu kontaktieren
        (Art. 6 Abs. 1 lit. b DSGVO). Die Daten werden in einer Datenbank bei Neon Inc. in der EU (Frankfurt) gespeichert
        und 180 Tage nach dem Reservierungsdatum automatisch gelöscht.
      </p>
      <p>
        Bestätigungen versenden wir per E-Mail über Google (Gmail). Ist die Online-Reservierung vorübergehend nicht
        verfügbar, öffnet das Formular stattdessen WhatsApp mit einer vorbereiteten Nachricht; die Übermittlung erfolgt
        dann erst, wenn Sie die Nachricht selbst absenden, und unterliegt den Bedingungen von WhatsApp (Meta).
      </p>

      <H>3a. Online-Bestellungen</H>
      <p>
        Für Bestellungen zur Lieferung oder Abholung verarbeiten wir Name, Telefonnummer, optional Ihre E-Mail-Adresse,
        bei Lieferung Ihre Adresse sowie die bestellten Speisen, um die Bestellung zuzubereiten, zu liefern und Sie über
        den Status zu informieren (Art. 6 Abs. 1 lit. b DSGVO). Bezahlt wird bei Übergabe; Zahlungsdaten verarbeiten wir
        auf der Website nicht. Bestellungen werden bei Neon Inc. (EU) gespeichert und nach 180 Tagen gelöscht, soweit keine
        gesetzlichen Aufbewahrungspflichten bestehen. Der Warenkorb wird bis zur Bestellung nur in Ihrem Browser gespeichert.
      </p>

      <H>3b. Kundenkonto und Anmeldung mit Google</H>
      <p>
        Wenn Sie ein Konto anlegen, speichern wir Name, E-Mail-Adresse, optional Telefonnummer und Ihre bevorzugte Sprache;
        Ihr Passwort wird ausschließlich als sicherer Hash gespeichert. Für die Anmeldung setzen wir ein technisch
        notwendiges Cookie (30 Tage). Im Profil können Sie Ihre Daten jederzeit herunterladen oder Ihr Konto löschen.
      </p>
      <p>
        Bei der „Anmeldung mit Google“ erhalten wir von Google Ihren Namen, Ihre E-Mail-Adresse und eine Kennung Ihres
        Google-Kontos (Art. 6 Abs. 1 lit. b DSGVO). Dabei gelten zusätzlich die Datenschutzbestimmungen von Google Ireland
        Ltd.
      </p>

      <H>4. Karte (Google Maps)</H>
      <p>
        Die Karte im Bereich „Anfahrt“ wird erst geladen, wenn Sie auf „Karte laden“ klicken. Erst dann werden Daten
        (u. a. Ihre IP-Adresse) an Google übertragen (Art. 6 Abs. 1 lit. a DSGVO, Einwilligung durch den Klick). Der Link
        „Route planen“ öffnet Google Maps in einem neuen Fenster.
      </p>

      <H>5. Schriften, Cookies und lokale Speicherung</H>
      <p>
        Schriften werden von unserem eigenen Server geladen, nicht von Google. Wir setzen keine Analyse- oder
        Werbe-Cookies. Ihre Sprachwahl (Deutsch, Englisch, Amharisch) wird nur in Ihrem Browser gespeichert
        (localStorage) und nicht an uns übertragen. Für den Anmeldebereich unseres Teams wird ein technisch notwendiges
        Cookie verwendet.
      </p>

      <H>6. Ihre Rechte</H>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
        und Widerspruch sowie das Recht, eine erteilte Einwilligung zu widerrufen. Wenden Sie sich dazu an die oben
        genannten Kontaktdaten. Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. beim
        Bayerischen Landesamt für Datenschutzaufsicht (BayLDA).
      </p>
    </LegalPage>
  );
}
