import { findOrder } from "@/lib/server/orders";
import { getMenu } from "@/lib/server/menu";

/* Live status for the order page (polled every few seconds). Requires the secret token from the order link. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const order = await findOrder(url.searchParams.get("r") ?? "", url.searchParams.get("t") ?? "");
  if (!order) return Response.json({ code: "notFound" }, { status: 404 });
  const names = new Map(
    (await getMenu()).flatMap((category) => category.items.map((dish) => [dish.id, dish.name] as const)),
  );
  return Response.json(
    {
      reference: order.reference,
      status: order.status,
      method: order.method,
      etaMinutes: order.etaMinutes,
      updatedAt: order.updatedAt,
      staffNote: order.staffNote,
      // names in every language from the current menu (the order itself stores the German name)
      items: order.items.map((line) => ({ ...line, names: names.get(line.id) ?? null })),
      subtotal: order.subtotal,
      deposit: order.deposit,
      deliveryFee: order.deliveryFee,
      total: order.total,
      wanted: order.wanted,
      payment: order.payment,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
