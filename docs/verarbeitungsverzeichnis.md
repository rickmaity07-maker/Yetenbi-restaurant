# Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)

**Entwurf, Stand Oktober 2026.** Erstellt aus dem Code der Website. Die Inhaberin oder der Inhaber ergänzt die
markierten Stellen, prüft alles und hält das Verzeichnis aktuell, wenn sich etwas ändert. Verarbeitungen außerhalb der
Website (Kasse, Lohnabrechnung, Papierlisten) gehören ebenfalls hinein.

## Verantwortlicher

| | |
| --- | --- |
| Name | Yetenbi Äthiopisches Restaurant & Café, Inhaber/in: **[ergänzen]** |
| Anschrift | Theaterstraße 6, 97070 Würzburg |
| Kontakt | **[E-Mail ergänzen]** |
| Datenschutzbeauftragter | nicht erforderlich (weniger als 20 Personen ständig mit der Verarbeitung beschäftigt) |

## Auftragsverarbeiter und Empfänger

| Dienstleister | Zweck | Ort | Grundlage für Drittland | AVV |
| --- | --- | --- | --- | --- |
| Vercel Inc. | Hosting, Serverfunktionen | Funktionen Frankfurt (fra1), Auslieferung weltweit | DPF + SCC | **[abschließen]** |
| Neon Inc. | Datenbank | Frankfurt (AWS eu-central-1) | SCC | **[abschließen]** |
| E-Mail-Dienst | Versand an Gäste und Team | derzeit Gmail (privates Konto) | – | **nicht möglich → Anbieter wechseln** |
| Cloudinary Ltd. | Fotos des Restaurants | Israel / EU / USA | Angemessenheit (IL), DPF/SCC | **[abschließen]** |
| Google Ireland Ltd. | Anmeldung mit Google, Karte (nach Klick) | EU / USA | eigene Verantwortlichkeit | – |

## Verarbeitungstätigkeiten

### 1. Tischreservierungen
- **Zweck:** Reservierungen annehmen, bestätigen, absagen; Gäste informieren.
- **Betroffene / Daten:** Gäste – Name, E-Mail, Telefon, Datum, Uhrzeit, Personenzahl, Anmerkung, Sprache, Status, Notiz des Teams.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO.
- **Empfänger:** Inhaber/innen (/admin), E-Mail-Dienst, Postfach des Restaurants.
- **Löschung:** automatisch 180 Tage nach dem Reservierungsdatum; E-Mail-Kopien in den Postfächern spätestens nach 180 Tagen (**Routine einrichten**).

### 2. Online-Bestellungen
- **Zweck:** Bestellungen zubereiten, liefern, abholen lassen; Gäste über jeden Schritt informieren.
- **Betroffene / Daten:** Gäste – Name, Telefon, E-Mail, Lieferadresse, Hinweise, Speisen, Beträge, Zahlungsart, Zeiten, Status; Team – wer welchen Schritt gemacht hat, zuständige/r Fahrer/in.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO; Gesundheitsangaben in Anmerkungen nur ausnahmsweise (Art. 9 Abs. 2 lit. a), Gäste werden gebeten, keine einzutragen.
- **Empfänger:** Inhaber/innen; Küche (nur Speisen und Anmerkung); zuständige/r Fahrer/in (Name, Adresse, Telefon, Betrag); E-Mail-Dienst.
- **Löschung:** automatisch 180 Tage nach der Bestellung. Aufbewahrungspflichtige Belege (§ 147 AO) liegen in der Kasse (**prüfen**).

### 3. Kundenkonten
- **Zweck:** Anmeldung, Profil, eigene Reservierungen und Bestellungen, Datenexport, Kontolöschung.
- **Daten:** Name, E-Mail, Telefon (optional), Sprache, Passwort-Hash, ggf. Google-Kennung, Sitzungen (Hash), Links zum Zurücksetzen (Hash, 1 Stunde).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO; Cookies nach § 25 Abs. 2 Nr. 2 TDDDG.
- **Löschung:** bis der Gast das Konto löscht; Sitzungen nach 30 Tagen.

### 4. Missbrauchsschutz
- **Zweck:** Scherz- und Massenbestellungen, Passwort-Rateversuche und Spam verhindern.
- **Daten:** Schlüssel-Hash der IP-Adresse, Telefonnummer (normalisiert), E-Mail, Sperrgrund, Zählerstände.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO.
- **Löschung:** IP-Hash 30 Tage, Sperren 1 Jahr, Zähler 1 Tag (automatisch).

### 5. Kundenübersicht und Notizen
- **Zweck:** Gäste betreuen, Scherzbestellungen erkennen.
- **Daten:** Zusammenfassung aus 1–3 (Anzahl, Umsatz, abgelehnte Bestellungen), freie Notiz des Teams (keine Gesundheitsdaten).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO.
- **Empfänger:** nur Inhaber/innen.
- **Löschung:** mit dem Konto; automatisch, sobald nichts anderes mehr über den Gast gespeichert ist.

### 6. Team-Zugänge und Protokoll
- **Zweck:** Arbeit in Verwaltung, Küche und Lieferung; Fehler nachvollziehen.
- **Betroffene / Daten:** Beschäftigte – Name, E-Mail, Rolle, Passwort-Hash, Protokolleinträge (Zeit, Handlung, Ziel).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Beschäftigungsverhältnis), Protokoll Art. 6 Abs. 1 lit. f.
- **Information:** /datenschutz/team.
- **Löschung:** Zugang bei Ende der Tätigkeit entfernen; Protokoll nach 1 Jahr automatisch.

### 7. Website-Aufruf
- **Zweck:** Auslieferung, Sicherheit.
- **Daten:** IP-Adresse, Zeit, Seite, Browser (Server-Protokolle bei Vercel).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO.
- **Löschung:** nach wenigen Tagen durch Vercel.

## Technische und organisatorische Maßnahmen (Art. 32)

- Verschlüsselte Übertragung (HTTPS mit HSTS); Datenbankverbindung über TLS.
- Passwörter mit scrypt und Salt; Sitzungen und Reset-Links nur als Hash gespeichert; Cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
- Rollen mit getrennten Rechten (Inhaber/in, Küche, Fahrer/in, Gast); jede Seite und Aktion prüft die Rolle.
- Begrenzung von Anmelde-, Reset-, Registrierungs- und Buchungsversuchen.
- IP-Adressen nur als Schlüssel-Hash; automatische Löschfristen (täglicher Cron-Job).
- Sicherheits-Header (Framing verboten, kein MIME-Sniffing, eingeschränkte Referrer und Browser-Rechte).
- Protokoll aller Handlungen in der Verwaltung.
- **Organisatorisch [ergänzen]:** wer Zugang hat, Passwortregeln für das Team, Vorgehen bei einer Datenpanne (Meldung an das BayLDA innerhalb von 72 Stunden, Art. 33), regelmäßiges Leeren der Postfächer.
