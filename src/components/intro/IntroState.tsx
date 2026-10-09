"use client";

import { createContext, useContext, useState } from "react";

type IntroState = { done: boolean; finish: () => void };

const Ctx = createContext<IntroState>({ done: true, finish: () => {} });

/** Lets the hero wait for the particle intro before it plays its own entrance. */
export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  return <Ctx.Provider value={{ done, finish: () => setDone(true) }}>{children}</Ctx.Provider>;
}

export const useIntro = () => useContext(Ctx);
