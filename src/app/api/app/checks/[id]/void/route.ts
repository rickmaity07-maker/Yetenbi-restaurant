import { appRoute, body, idOf } from "@/lib/server/app-auth";
import { voidCheck } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/* POST { reason? }: frees the table without payment (service staff only when nothing is owed). */
export const POST = appRoute<Ctx>(async (request, user, { params }) =>
  voidCheck(user, idOf((await params).id), String((await body(request)).reason ?? "").trim()),
);
