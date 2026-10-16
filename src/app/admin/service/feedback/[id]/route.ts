import { getCurrentUser } from "@/lib/server/auth";
import { feedbackScreenshot } from "@/lib/server/app-feedback";

type Ctx = { params: Promise<{ id: string }> };

/* GET: the screenshot sent with a piece of app feedback. Owners only. */
export async function GET(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (user?.role !== "owner") return new Response("Not found", { status: 404 });
  const id = Number((await params).id);
  const image = Number.isSafeInteger(id) && id > 0 ? await feedbackScreenshot(id) : null;
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
}
