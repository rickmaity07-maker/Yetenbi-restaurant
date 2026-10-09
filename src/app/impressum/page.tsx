import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { restaurant } from "@/lib/data";

export const metadata: Metadata = { title: "Impressum" };

// TODO: Fill in the owner's full name (and VAT ID, if any) per § 5 DDG before going live.
export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <p className="font-display text-lg text-cream/80">Angaben gemäß § 5 DDG</p>
      <p>
        Yetenbi Äthiopisches Restaurant & Café
        <br />
        Inhaber/in: <strong>[Name wird ergänzt]</strong>
        <br />
        {restaurant.street}
        <br />
        {restaurant.city}
      </p>
      <p>
        Telefon: <a href={restaurant.phoneHref} className="text-gold-soft underline underline-offset-4">{restaurant.phone}</a>
      </p>
      <p>Umsatzsteuer-ID: [falls vorhanden, wird ergänzt]</p>
      <p className="pt-4 text-sm text-cream/60">
        Fotos: Unsplash (Unsplash-Lizenz). Gestaltung und Umsetzung der Website: im Auftrag von Yetenbi.
      </p>
    </LegalPage>
  );
}
