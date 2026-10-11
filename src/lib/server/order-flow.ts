import "server-only";
import { canMove, type OrderStatus, type StaffRole } from "@/lib/ordering";
import { findUserById, staffEmails, type User } from "./auth";
import { notifyStaffOrder, sendOrderEmail } from "./email";
import { advanceOrder, findOrderById } from "./orders";
import { audit } from "./audit";

/**
  The one way an order moves on, for owners, kitchen and drivers alike: checks the role may make this step,
  changes the order only if it is still where the screen showed it, then emails the guest and the team.
*/
export async function moveOrder(
  user: User,
  id: number,
  from: OrderStatus,
  to: OrderStatus,
  extra: { driverId?: number | null; eta?: number | null; staffNote?: string } = {},
) {
  if (user.role === "guest") return null;
  const role: StaffRole = user.role;
  const current = await findOrderById(id);
  if (!current || current.status !== from || !canMove(role, from, to, current.method)) return null;

  let driver: User | null = null;
  if (to === "on_the_way" && extra.driverId) {
    driver = await findUserById(extra.driverId);
    if (driver?.role !== "driver") driver = null;
  }

  const order = await advanceOrder(id, from, to, {
    driverId: driver?.id ?? null,
    onlyDriver: role === "driver" ? user.id : undefined,
    eta: extra.eta,
    staffNote: extra.staffNote,
  });
  if (!order) return null;

  const restaurant = process.env.RESERVATION_NOTIFY_EMAIL;
  const mails: Promise<unknown>[] = [sendOrderEmail(to === "new" ? "received" : to, order)];
  if (to === "accepted")
    mails.push(staffEmails("kitchen").then((emails) => notifyStaffOrder("kitchen", order, emails)));
  if (to === "packed" && role !== "owner") mails.push(notifyStaffOrder("packed", order, [restaurant]));
  if (to === "on_the_way" && driver) mails.push(notifyStaffOrder("driver", order, [driver.email]));
  if (to === "completed" && role !== "owner") {
    order.driverName = role === "driver" ? user.name : undefined;
    mails.push(notifyStaffOrder("completed", order, [restaurant]));
  }
  await Promise.all(mails);
  const label: Record<string, string> = {
    accepted: `Bestellung angenommen (${order.etaMinutes ?? "?"} Min.)`,
    rejected: "Bestellung abgelehnt",
    cooked: "Essen fertig",
    packed: "Verpackt",
    on_the_way: driver ? `An ${driver.name} übergeben` : "Zur Lieferung übergeben",
    ready: "Abholbereit",
    completed: order.method === "delivery" ? "Zugestellt" : "Abgeholt",
    cancelled: "Bestellung storniert",
  };
  await audit(user, "orders", label[to] ?? to, order.reference, { total: order.total });
  return order;
}
