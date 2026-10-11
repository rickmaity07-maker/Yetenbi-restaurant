/** The heading of an admin page: what it is and what you do there, in one line. Navigation lives in the sidebar. */

const PAGES = {
  dashboard: { title: "Übersicht", lead: "Was jetzt zu tun ist und wie der Tag läuft." },
  reservations: {
    title: "Reservierungen",
    lead: "Anfragen annehmen oder ablehnen, telefonische Reservierungen eintragen, Schließtage.",
  },
  orders: {
    title: "Bestellungen",
    lead: "Neue Bestellungen annehmen, an Fahrer übergeben, Einstellungen für Lieferung und Abholung.",
  },
  menu: {
    title: "Speisekarte",
    lead: "Kategorien und Gerichte anlegen, ändern, sortieren, ausverkauft melden; Allergene und Pfand.",
  },
  photos: { title: "Fotos", lead: "Die Bilder der Website durch eigene Fotos ersetzen." },
  reports: {
    title: "Berichte",
    lead: "Umsatz, Bestellungen und Reservierungen über einen Zeitraum, mit Export für die Buchhaltung.",
  },
  customers: { title: "Kunden", lead: "Alle Gäste mit ihren Bestellungen, Reservierungen und euren Notizen." },
  log: { title: "Protokoll", lead: "Wer im Team wann was geändert hat." },
  settings: {
    title: "Betrieb & Rechtliches",
    lead: "Öffnungszeiten, Kontaktdaten und die Angaben für Impressum und Datenschutz.",
  },
  team: { title: "Team & Zugänge", lead: "Logins für Verwaltung, Küche und Fahrer anlegen und verwalten." },
} as const;

type AdminPage = keyof typeof PAGES;

export default function AdminHeader({ active, children }: { active: AdminPage; children?: React.ReactNode }) {
  const page = PAGES[active];
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-cream/10 pb-6">
      <div>
        <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">{page.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream/60">{page.lead}</p>
      </div>
      {children}
    </div>
  );
}
