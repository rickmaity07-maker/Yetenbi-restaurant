import { appRoute, body, idOf } from "@/lib/server/app-auth";
import { mergeChecks } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/* POST { from: checkId }: two tables pushed together; the other table's check moves onto this one. */
export const POST = appRoute<Ctx>(async (request, user, { params }) =>
  mergeChecks(user, idOf((await params).id), idOf(String((await body(request)).from ?? ""))),
);
