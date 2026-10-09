import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import AccountShell from "@/components/account/AccountShell";
import { todayISO } from "@/lib/booking";
import { getPasswordHash, requireUser } from "@/lib/server/auth";
import { listForUser } from "@/lib/server/reservations";
import ProfileView from "./ProfileView";

export const metadata: Metadata = { title: "Mein Konto", robots: { index: false } };

/** Reads the session and the guest's bookings at request time. */
async function ProfileData() {
  await connection();
  const user = await requireUser();
  const [bookings, hash] = await Promise.all([listForUser(user.id), getPasswordHash(user.id)]);
  return (
    <ProfileView
      user={{ name: user.name, email: user.email, phone: user.phone, role: user.role, locale: user.locale }}
      bookings={bookings.map((b) => ({ id: b.id, reference: b.reference, date: b.date, time: b.time, guests: b.guests, status: b.status }))}
      today={todayISO()}
      hasPassword={hash !== "none"}
    />
  );
}

export default function ProfilePage() {
  return (
    <AccountShell wide>
      <Suspense fallback={<div className="h-96" />}>
        <ProfileData />
      </Suspense>
    </AccountShell>
  );
}
