"use client";

import { createContext, useContext } from "react";
import { WEEK, type DayHours } from "@/lib/hours";

/* The opening hours the owner set in /admin, for the hours table and the reservation times on the website. */

const HoursContext = createContext<DayHours[]>(WEEK);

export function HoursProvider({ hours, children }: { hours: DayHours[]; children: React.ReactNode }) {
  return <HoursContext.Provider value={hours}>{children}</HoursContext.Provider>;
}

export const useHours = () => useContext(HoursContext);
