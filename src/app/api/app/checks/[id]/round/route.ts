import { ApiError, appRoute, body, idOf } from "@/lib/server/app-auth";
import { parseRound } from "@/lib/service";
import { addRound } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string }> };

/*
  POST { items: [{ itemId, qty, note, seat?, hold? }], key? }: food to the kitchen (or held for later), drinks onto
  the bill. The same key twice books the round once (a retry after a dropped connection).
*/
export const POST = appRoute<Ctx>(async (request, user, { params }) => {
  const input = await body<{ items?: unknown; key?: unknown }>(request);
  const lines = parseRound(input.items);
  if (!lines) throw new ApiError(422, "items_invalid");
  return addRound(user, idOf((await params).id), lines, typeof input.key === "string" ? input.key : null);
});
