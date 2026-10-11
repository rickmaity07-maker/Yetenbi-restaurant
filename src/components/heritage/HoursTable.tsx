"use client";

import { useEffect, useState } from "react";
import { berlinNow, groupedHours, openState } from "@/lib/hours";
import { useLanguage } from "@/lib/language";
import { useClosures } from "@/lib/account-client";
import { useHours } from "@/components/Business";

/** Weekly hours, grouped ("Mo, Di"), with today highlighted and a live open/closed line (client-only: depends on the clock). */
export default function HoursTable() {
  const { t } = useLanguage();
  const week = useHours();
  const [now, setNow] = useState<{ day: number; state: ReturnType<typeof openState> } | null>(null);

  useEffect(() => {
    const tick = () => setNow({ day: berlinNow().day, state: openState(new Date(), week) });
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [week]);

  const closures = useClosures().slice(0, 3);
  const rows = groupedHours(week);
  const label = (days: number[]) => {
    const names = days.map((day) => t.daysShort[day]);
    // three or more consecutive days read as a range
    return names.length >= 3 ? `${names[0]}-${names[names.length - 1]}` : names.join(", ");
  };

  return (
    <div>
      <dl className="space-y-1">
        {rows.map((row) => {
          const today = now && row.days.includes(now.day);
          return (
            <div
              key={row.days.join()}
              className={`flex justify-between gap-6 font-display text-lg md:text-xl ${today ? "text-gold-soft" : "text-cream/85"}`}
            >
              <dt>{label(row.days)}</dt>
              <dd className="tabular-nums">
                {row.hours ? `${t.clock(row.hours.open)} - ${t.clock(row.hours.close)}` : "-"}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 flex min-h-5 items-center gap-2 text-sm text-cream/70" aria-live="polite">
        {now && (
          <>
            <span
              className={`h-1.5 w-1.5 rounded-full ${now.state.open ? "bg-[#7fcf9c]" : "bg-[#f0a080]"}`}
              aria-hidden
            />
            {now.state.open
              ? t.visit.openNow(now.state.until)
              : t.visit.opensAt(now.state.day === now.day ? t.visit.today : t.days[now.state.day], now.state.at)}
          </>
        )}
      </p>
      {closures.map((closure) => (
        <p key={closure.date} className="mt-1 text-sm text-[#f0a080]">
          {t.visit.closedOn(
            new Date(`${closure.date}T12:00:00Z`).toLocaleDateString(t.dateLocale, {
              weekday: "short",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            }),
            closure.note,
          )}
        </p>
      ))}
    </div>
  );
}
