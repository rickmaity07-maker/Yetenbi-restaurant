"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cancelMyBooking, changePassword, deleteAccount, logout, updateProfile } from "@/app/account-actions";
import { content, LOCALES, type Locale } from "@/lib/i18n";
import { formatEuro, type OrderStatus } from "@/lib/ordering";
import { useLanguage } from "@/lib/language";
import { homeFor, type Role } from "@/lib/roles";
import { AuthField, fieldClass, FormMessage, SubmitButton } from "@/components/account/AccountShell";

type ProfileBooking = {
  id: number;
  reference: string;
  date: string;
  time: string;
  guests: number;
  status: "pending" | "confirmed" | "declined" | "cancelled";
};

type Props = {
  user: { name: string; email: string; phone: string; role: Role; locale: Locale };
  bookings: ProfileBooking[];
  today: string;
  /** false for accounts that only sign in with Google */
  hasPassword: boolean;
  orders: { reference: string; status: OrderStatus; total: number; createdAt: string; method: "delivery" | "pickup"; url: string }[];
};

const tone: Record<ProfileBooking["status"], string> = {
  pending: "border-gold/60 text-gold-soft",
  confirmed: "border-[#7fcf9c]/60 text-[#9fe0b6]",
  declined: "border-[#f0a080]/60 text-[#f0a080]",
  cancelled: "border-cream/30 text-cream/60",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gold/20 pt-10">
      <h2 className="font-display text-3xl font-semibold text-gold-soft">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function ProfileView({ user, bookings, today, hasPassword, orders }: Props) {
  const { t } = useLanguage();
  const a = t.account;
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, null);
  const [pwState, pwAction, pwPending] = useActionState(changePassword, null);
  const [delState, delAction, delPending] = useActionState(deleteAccount, null);

  const upcoming = bookings.filter((b) => b.date >= today).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  const past = bookings.filter((b) => b.date < today);
  const dateLabel = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(t.dateLocale, { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  const renderList = (items: ProfileBooking[], canCancel: boolean) =>
    items.length === 0 ? (
      <p className="font-display text-xl italic text-cream/65">{a.none}</p>
    ) : (
      <ul className="space-y-3">
        {items.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-4 border border-gold/20 bg-ink/40 px-5 py-4">
            <div>
              <p className="font-display text-xl text-cream">
                {dateLabel(b.date)}, {t.clock(b.time)}
              </p>
              <p className="text-sm text-cream/65">
                {t.reserve.guests}: {b.guests} · {b.reference}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${tone[b.status]}`}>{a.status[b.status]}</span>
              {canCancel && (b.status === "pending" || b.status === "confirmed") && (
                <form action={cancelMyBooking}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="text-sm text-cream/70 underline underline-offset-4 hover:text-[#f0a080]">{a.cancel}</button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">{a.hello(user.name)}</h1>
          <p className="mt-2 text-cream/65">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {user.role !== "guest" && (
            <Link href={homeFor(user.role)} className="rounded-full border border-gold/60 px-5 py-2 text-sm font-semibold text-gold-soft hover:bg-gold hover:text-ink">
              {user.role === "owner" ? a.adminLink : user.role === "kitchen" ? "Zur Küche" : "Zu den Lieferungen"}
            </Link>
          )}
          <form action={logout}>
            <button className="text-sm text-cream/70 underline underline-offset-4 hover:text-cream">{a.signOut}</button>
          </form>
        </div>
      </div>

      <Section title={a.upcoming}>
        {renderList(upcoming, true)}
        <Link href="/#reservieren" className="mt-6 inline-block text-sm font-semibold text-gold-soft underline decoration-gold/40 underline-offset-4">
          {a.bookNow}
        </Link>
      </Section>

      {orders.length > 0 && (
        <Section title={t.order.orders}>
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.reference} className="flex flex-wrap items-center justify-between gap-4 border border-gold/20 bg-ink/40 px-5 py-4">
                <div>
                  <p className="font-display text-xl text-cream">
                    {new Date(o.createdAt).toLocaleDateString(t.dateLocale, { day: "numeric", month: "long", year: "numeric" })} · {formatEuro(o.total, t.dateLocale)}
                  </p>
                  <p className="text-sm text-cream/65">
                    {o.method === "delivery" ? t.order.delivery : t.order.pickup} · {o.reference} · {t.order.status[o.status]}
                  </p>
                </div>
                <a href={o.url} className="text-sm font-semibold text-gold-soft underline decoration-gold/40 underline-offset-4">
                  {t.order.viewStatus}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {past.length > 0 && (
        <Section title={a.past}>
          {renderList(past, false)}
        </Section>
      )}

      <Section title={a.details}>
        <form action={profileAction} className="grid gap-8 md:grid-cols-2">
          <AuthField id="name" label={a.name} defaultValue={user.name} autoComplete="name" required />
          <AuthField id="phone" label={a.phone} defaultValue={user.phone} type="tel" autoComplete="tel" />
          <div className="flex flex-col gap-2">
            <label htmlFor="locale" className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">
              {a.language}
            </label>
            <select id="locale" name="locale" defaultValue={user.locale} className={`${fieldClass} [color-scheme:dark]`}>
              {LOCALES.map((l) => (
                <option key={l} value={l} className="bg-coal text-base">
                  {content[l].langName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-start justify-end gap-3">
            <FormMessage error={profileState?.error && a.errors[profileState.error]} ok={profileState?.ok ? a.saved : undefined} />
            <SubmitButton pending={profilePending}>{a.save}</SubmitButton>
          </div>
        </form>
      </Section>

      <Section title={a.changePw}>
        {!hasPassword && <p className="mb-6 text-cream/75">{a.noPassword}</p>}
        <form action={pwAction} className="grid gap-8 md:grid-cols-2">
          {hasPassword && <AuthField id="current" label={a.currentPw} type="password" autoComplete="current-password" required />}
          <AuthField id="password" label={a.newPassword} type="password" autoComplete="new-password" minLength={8} required hint={a.passwordHint} />
          <div className="flex flex-col items-start gap-3 md:col-span-2">
            <FormMessage error={pwState?.error && a.errors[pwState.error]} ok={pwState?.ok ? a.pwChanged : undefined} />
            <SubmitButton pending={pwPending}>{a.changePw}</SubmitButton>
          </div>
        </form>
      </Section>

      <Section title={a.data}>
        <p className="text-cream/75">{a.dataText}</p>
        <a href="/api/me/export" className="mt-4 inline-block text-sm font-semibold text-gold-soft underline decoration-gold/40 underline-offset-4">
          {a.export}
        </a>
      </Section>

      <Section title={a.deleteTitle}>
        <p className="max-w-xl text-cream/75">{a.deleteText}</p>
        <form action={delAction} className="mt-6 grid max-w-md gap-6">
          {hasPassword ? (
            <AuthField id="current" label={a.currentPw} type="password" autoComplete="current-password" required />
          ) : (
            <AuthField id="current" label={a.email} type="email" placeholder={user.email} required />
          )}
          <FormMessage error={delState?.error && a.errors[delState.error]} />
          <button
            disabled={delPending}
            className="w-max rounded-full border border-[#f0a080]/60 px-6 py-3 text-sm font-semibold text-[#f0a080] hover:bg-[#f0a080] hover:text-ink disabled:opacity-60"
          >
            {a.deleteConfirm}
          </button>
        </form>
      </Section>
    </div>
  );
}
