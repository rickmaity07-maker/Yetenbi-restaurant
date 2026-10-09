import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Datenschutz | Yetenbi" };

// TODO: Replace with a full privacy policy (DSGVO), including the embedded Google Maps iframe.
export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutz">
      <p>
        Diese Website bindet eine Karte von Google Maps ein. Beim Laden der Karte werden Daten an Google übertragen.
      </p>
      <p>Die vollständige Datenschutzerklärung wird in Kürze ergänzt.</p>
    </LegalPage>
  );
}
