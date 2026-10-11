import type { Metadata } from "next";
import AccountShell from "@/components/account/AccountShell";
import OrderView from "./OrderView";

export const metadata: Metadata = {
  title: "Online bestellen",
  description:
    "Äthiopisch essen in Würzburg: Kitfo, Tibs, Wot und vegane Beyaynetu zum Abholen oder Liefern bestellen.",
};

export default function OrderPage() {
  return (
    <AccountShell wide>
      <OrderView />
    </AccountShell>
  );
}
