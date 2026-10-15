import { appRoute, body, idOf } from "@/lib/server/app-auth";
import { getCheck, updateCheck } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/* GET: one check with its items. PATCH { guests?, note?, tableId? }: change it or move it to another table. */
export const GET = appRoute<Ctx>(async (_request, _user, { params }) => getCheck(idOf((await params).id)));
export const PATCH = appRoute<Ctx>(async (request, user, { params }) =>
  updateCheck(user, idOf((await params).id), await body(request)),
);
