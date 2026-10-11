import type { Instrumentation } from "next";

/** Every server error (pages, server actions, API routes) is reported by email; see lib/server/alerts.ts. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./lib/server/alerts");
  await reportError(`${context.routeType} ${context.routePath}`, error, request.path);
};
