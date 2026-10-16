import { ApiError, appRoute, body } from "@/lib/server/app-auth";
import { db } from "@/lib/server/db";

const MAX_SCREENSHOT = 900_000; // base64 characters, about 650 KB of JPEG

/*
  POST { message, screen, screenshot?, appVersion, device }: "Send feedback" in the app, with a screenshot of the
  screen the tester was on. Shown to the owners in /admin/service.
*/
export const POST = appRoute(async (request, user) => {
  const input = await body(request);
  const message = String(input.message ?? "")
    .trim()
    .slice(0, 4000);
  const screenshot = typeof input.screenshot === "string" && input.screenshot ? input.screenshot : null;
  if (!message && !screenshot) throw new ApiError(422, "feedback_empty");
  if (screenshot && (screenshot.length > MAX_SCREENSHOT || !/^\/9j\/[A-Za-z0-9+/=]+$/.test(screenshot)))
    throw new ApiError(422, "screenshot_invalid");
  const text = (key: string, max: number) => String(input[key] ?? "").slice(0, max);
  await db()`
    insert into app_feedback (user_name, message, screen, screenshot, app_version, device)
    values (${user.name}, ${message}, ${text("screen", 60)}, ${screenshot}, ${text("appVersion", 20)}, ${text("device", 80)})
  `;
  return { ok: true };
});
