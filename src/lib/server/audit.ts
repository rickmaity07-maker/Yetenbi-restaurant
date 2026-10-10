import "server-only";
import type { User } from "./auth";
import { db } from "./db";

/*
  The team's activity log (/admin/protokoll). Writing never blocks or breaks the action it records.
  Entries older than one year are removed by the daily clean-up.
*/

export type Area = "orders" | "reservations" | "menu" | "photos" | "settings" | "team" | "login" | "customers";

export async function audit(user: Pick<User, "id" | "name" | "role"> | null, area: Area, action: string, target = "", details?: Record<string, unknown>) {
  try {
    await db()`
      insert into audit_log (user_id, actor, role, area, action, target, details)
      values (${user?.id ?? null}, ${user?.name ?? "System"}, ${user?.role ?? ""}, ${area}, ${action}, ${target.slice(0, 200)},
              ${details ? JSON.stringify(details) : null}::jsonb)
    `;
  } catch (error) {
    console.error("Audit log write failed", area, action, error);
  }
}

export type AuditEntry = { id: number; at: string; actor: string; role: string; area: Area; action: string; target: string; details: Record<string, unknown> | null };

export async function listAudit(filter: { area?: string; actor?: string; q?: string; limit?: number }) {
  const rows = (await db()`
    select id, at, actor, role, area, action, target, details from audit_log
    where (${filter.area ?? ""} = '' or area = ${filter.area ?? ""})
      and (${filter.actor ?? ""} = '' or actor = ${filter.actor ?? ""})
      and (${filter.q ?? ""} = '' or action ilike ${"%" + (filter.q ?? "") + "%"} or target ilike ${"%" + (filter.q ?? "") + "%"})
    order by at desc limit ${filter.limit ?? 200}
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: Number(r.id),
    at: new Date(String(r.at)).toISOString(),
    actor: String(r.actor),
    role: String(r.role),
    area: r.area as Area,
    action: String(r.action),
    target: String(r.target),
    details: (r.details as Record<string, unknown> | null) ?? null,
  })) satisfies AuditEntry[];
}

export async function auditActors() {
  const rows = (await db()`select distinct actor from audit_log where at > now() - interval '1 year' order by actor`) as { actor: string }[];
  return rows.map((r) => r.actor);
}

export async function purgeAudit() {
  await db()`delete from audit_log where at < now() - interval '1 year'`;
}
