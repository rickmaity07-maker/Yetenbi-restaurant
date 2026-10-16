import { ApiError, appRoute, body } from "@/lib/server/app-auth";
import { daySummary, listClosedChecks, listOpenChecks, menuStamp, openCheck } from "@/lib/server/service";

/*
  GET: the open checks, and a stamp that changes whenever the menu or the table plan does (the app then reloads
  them at once). ?closed=YYYY-MM-DD: the checks closed that day with the day's figures. POST: open a table.
*/
export const GET = appRoute(async (request) => {
  const closed = new URL(request.url).searchParams.get("closed");
  if (closed === null) {
    const [checks, stamp] = await Promise.all([listOpenChecks(), menuStamp()]);
    return { checks, stamp };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closed)) throw new ApiError(422, "date_invalid");
  const [checks, summary] = await Promise.all([listClosedChecks(closed), daySummary(closed)]);
  return { checks, summary };
});

export const POST = appRoute(async (request, user) => openCheck(user, await body(request)));
