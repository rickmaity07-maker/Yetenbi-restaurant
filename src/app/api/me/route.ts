import { getCurrentUser } from "@/lib/server/auth";

/* Who is signed in (for the header and to prefill the booking form). Never cached. */
export async function GET() {
  const user = await getCurrentUser();
  return Response.json(
    {
      user: user
        ? { name: user.name, email: user.email, phone: user.phone, role: user.role, emailVerified: user.emailVerified }
        : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
