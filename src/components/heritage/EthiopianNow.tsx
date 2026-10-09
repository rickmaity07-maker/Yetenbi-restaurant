"use client";

import { useEffect, useState } from "react";
import { addisNow, geez, MONTHS } from "@/lib/ethiopic";

type Now = ReturnType<typeof addisNow>;

/** Today in Addis Ababa: the Ethiopian calendar date (also in Ge'ez numerals) and the hour counted from sunrise. */
export default function EthiopianNow({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<Now | null>(null);

  // The date only exists in the browser; tick once a minute.
  useEffect(() => {
    const tick = () => setNow(addisNow());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className={`min-h-[7.5rem] ${className}`} aria-hidden />;

  const { date, ethHour, daytime, h, min } = now;
  const month = MONTHS[date.month - 1];
  const western = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

  return (
    <div className={className}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">Heute in Addis Abeba</p>
      <p className="mt-2 font-display text-2xl text-cream md:text-3xl">
        {date.day}. {month.de} {date.year}
      </p>
      <p className="mt-1 font-ethiopic text-base text-gold/80" lang="am">
        {month.am} {geez(date.day)} ቀን {geez(date.year)} ዓ.ም.
      </p>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream/68">
        Dort ist es {western} Uhr, auf Äthiopisch {ethHour} Uhr {daytime ? "am Tag" : "in der Nacht"}: die Stunden zählen ab Sonnenaufgang.
      </p>
    </div>
  );
}
