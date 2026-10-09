import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { restaurant } from "@/lib/data";

export const metadata: Metadata = { title: "Impressum | Yetenbi" };

// TODO: Replace with the restaurant's legal details (owner, address, contact, tax ID) per § 5 DDG.
export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <p>
        Yetenbi Äthiopisches Restaurant & Café
        <br />
        {restaurant.street}
        <br />
        {restaurant.city}
      </p>
      <p>Telefon: {restaurant.phone}</p>
      <p>Die vollständigen Angaben nach § 5 DDG werden in Kürze ergänzt.</p>
    </LegalPage>
  );
}
