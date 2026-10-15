import { appRoute, idOf } from "@/lib/server/app-auth";
import { reopenCheck } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/* POST: owners only; a check paid by mistake goes back to its table. */
export const POST = appRoute<Ctx>(async (_request, user, { params }) => reopenCheck(user, idOf((await params).id)));
