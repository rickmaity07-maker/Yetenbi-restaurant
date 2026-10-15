import { ApiError, appRoute, body, idOf } from "@/lib/server/app-auth";
import { parseRound } from "@/lib/service";
import { addRound } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/* POST { items: [{ itemId, qty, note }] }: food to the kitchen, drinks onto the bill. */
export const POST = appRoute<Ctx>(async (request, user, { params }) => {
  const lines = parseRound((await body<{ items?: unknown }>(request)).items);
  if (!lines) throw new ApiError(422, "items_invalid");
  return addRound(user, idOf((await params).id), lines);
});
