import { appRoute, body, idOf } from "@/lib/server/app-auth";
import { payCheck } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/* POST { method: "cash" | "card", tip?, given? }: the whole check is paid and the table is free again. */
export const POST = appRoute<Ctx>(async (request, user, { params }) =>
  payCheck(user, idOf((await params).id), await body(request)),
);
