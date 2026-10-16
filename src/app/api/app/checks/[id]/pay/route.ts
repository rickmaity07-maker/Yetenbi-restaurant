import { appRoute, body, idOf } from "@/lib/server/app-auth";
import { payCheck } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/*
  POST { method: "cash" | "card", tip?, given?, key? }: the rest of the check is paid and the table is free again.
  Split bill: { ..., amount, due, items?: [{ id, qty }], label? } pays one part (see payCheck).
*/
export const POST = appRoute<Ctx>(async (request, user, { params }) =>
  payCheck(user, idOf((await params).id), await body(request)),
);
