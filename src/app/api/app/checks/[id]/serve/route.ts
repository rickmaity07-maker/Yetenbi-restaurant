import { appRoute, idOf } from "@/lib/server/app-auth";
import { serveReady } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/* POST: everything the kitchen finished for this table has been carried out. */
export const POST = appRoute<Ctx>(async (_request, _user, { params }) => serveReady(idOf((await params).id)));
