import { findOrder } from "@/lib/server/orders";

/* Live status for the order page (polled every few seconds). Requires the secret token from the order link. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const order = await findOrder(url.searchParams.get("r") ?? "", url.searchParams.get("t") ?? "");
  if (!order) return Response.json({ code: "notFound" }, { status: 404 });
  return Response.json(
    {
      reference: order.reference,
      status: order.status,
      method: order.method,
      etaMinutes: order.etaMinutes,
      updatedAt: order.updatedAt,
      staffNote: order.staffNote,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      wanted: order.wanted,
      payment: order.payment,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
