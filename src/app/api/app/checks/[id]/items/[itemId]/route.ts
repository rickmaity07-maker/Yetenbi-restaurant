import { appRoute, body, idOf } from "@/lib/server/app-auth";
import { changeItem } from "@/lib/server/service";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/* PATCH { action: "serve" } or { action: "void", reason } */
export const PATCH = appRoute<Ctx>(async (request, user, { params }) => {
  const { id, itemId } = await params;
  return changeItem(user, idOf(id), idOf(itemId), await body(request));
});
