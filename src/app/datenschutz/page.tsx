import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { restaurant } from "@/lib/data";
import { getBusiness } from "@/lib/server/business";

export const metadata: Metadata = { title: "Datenschutz" };

const H = ({ children }: { children: React.ReactNode }) => <h2 className="pt-6 font-display text-2xl font-semibold text-gold-soft">{children}</h2>;

// The owner's name and email come from /admin → Betrieb & Rechtliches; have the text checked before going live.
export default async function Datenschutz() {
  const b = await getBusiness();
  return (
    <LegalPage title="Datenschutz">
      <p>Wir freuen uns über Ihren Besuch. Hier erklären wir, welche Daten diese Website verarbeitet und wofür.</p>

      <H>1. Verantwortlicher</H>
      <p>
        Yetenbi Äthiopisches Restaurant & Café, Inhaber/in: <strong>{b.ownerName || "[Name wird ergänzt]"}</strong>
        <br />
        {restaurant.street}, {restaurant.city}
        <br />
        Telefon: {restaurant.phone}
        {b.contactEmail && (
          <>
            <br />
            E-Mail: {b.contactEmail}
          </>
        )}
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
        Zum Bestellen ist ein Kundenkonto nötig. Für Bestellungen zur Lieferung oder Abholung verarbeiten wir Name,
        Telefonnummer, die E-Mail-Adresse Ihres Kontos, bei Lieferung Ihre Adresse sowie die bestellten Speisen, um die
        Bestellung zuzubereiten, zu liefern und Sie bei jedem Schritt per E-Mail über den Status zu informieren
        (Art. 6 Abs. 1 lit. b DSGVO). Innerhalb des Restaurants sieht die Küche nur die Speisen und Ihre Anmerkung, die
        Fahrerin oder der Fahrer nur die eigenen Lieferungen mit Name, Adresse, Telefonnummer und Betrag. Bezahlt wird bei Übergabe; Zahlungsdaten verarbeiten wir
        auf der Website nicht. Bestellungen werden bei Neon Inc. (EU) gespeichert und nach 180 Tagen gelöscht, soweit keine
        gesetzlichen Aufbewahrungspflichten bestehen. Der Warenkorb wird bis zur Bestellung nur in Ihrem Browser gespeichert.
      </p>
      <p>
        Zum Schutz vor Scherz- und Massenbestellungen speichern wir zu jeder Bestellung einen pseudonymisierten Kennwert
        (Hash) Ihrer IP-Adresse, nicht die IP-Adresse selbst, und begrenzen damit die Zahl der Bestellungen je Gerät und
        Telefonnummer. Der Kennwert wird nach 30 Tagen gelöscht. Nach einer Scherzbestellung können wir Telefonnummer,
        E-Mail-Adresse und diesen Kennwert für Online-Bestellungen sperren; die Sperre wird nach spätestens einem Jahr
        gelöscht (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse am Schutz vor Missbrauch).
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

      <H>3c. Schutz vor Missbrauch</H>
      <p>
        Um Passwort-Rateversuche, massenhafte Anmeldungen, Reservierungen und E-Mails zu verhindern, zählen wir Versuche je
        E-Mail-Adresse und je pseudonymisiertem Kennwert (Hash) Ihrer IP-Adresse, nicht der IP-Adresse selbst. Diese
        Einträge werden nach einem Tag gelöscht (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an der Sicherheit
        der Website und Ihres Kontos).
      </p>

      <H>3d. Fotos (Cloudinary)</H>
      <p>
        Fotos, die das Restaurant selbst hochlädt, werden über den Bilddienst Cloudinary (Cloudinary Ltd., Israel, mit
        Servern u. a. in der EU und den USA) gespeichert und ausgeliefert. Beim Anzeigen dieser Fotos wird Ihre IP-Adresse
        technisch bedingt an Cloudinary übertragen (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an einer schnellen
        Darstellung). Für Israel besteht ein Angemessenheitsbeschluss der EU-Kommission; Übermittlungen in die USA erfolgen
        auf Grundlage des EU-US Data Privacy Framework bzw. von Standardvertragsklauseln. Die übrigen Bilder liefern wir von
        unserem eigenen Server aus.
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
        Werbe-Cookies und keine Tracking-Dienste, daher gibt es auch kein Cookie-Banner. Ihre Sprachwahl (Deutsch,
        Englisch, Amharisch) und Ihr Warenkorb werden nur in Ihrem Browser gespeichert (localStorage) und erst mit der
        Bestellung an uns übertragen. Wenn Sie sich anmelden, setzen wir ein technisch notwendiges Sitzungs-Cookie
        (30 Tage); bei der Anmeldung mit Google zusätzlich für höchstens 10 Minuten ein Cookie zur Absicherung des
        Anmeldevorgangs. Diese Speicherungen sind für die von Ihnen gewünschten Funktionen unbedingt erforderlich
        (§ 25 Abs. 2 Nr. 2 TDDDG).
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
