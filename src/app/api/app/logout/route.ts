import { appRoute, revokeAppToken } from "@/lib/server/app-auth";

export const POST = appRoute(async (request) => {
  await revokeAppToken(request);
});
