import { appRoute, idOf } from "@/lib/server/app-auth";
import { fireHeld } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/* POST: the dishes waiting as "later" (e.g. the mains) go to the kitchen now. */
export const POST = appRoute<Ctx>(async (_request, _user, { params }) => fireHeld(idOf((await params).id)));
