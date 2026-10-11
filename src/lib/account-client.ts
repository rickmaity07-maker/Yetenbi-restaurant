"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Role } from "@/lib/roles";

/*
  Tiny shared stores for the public page: who is signed in (/api/me) and upcoming closed days
  (/api/closures). Each is fetched once per page load, however many components ask for it.
*/

type Me = { name: string; email: string; phone: string; role: Role } | null;
type ClosedDay = { date: string; note: string };

/** `failed` is what the store holds when the request does not work (default: stays `initial`). */
function createStore<T>(url: string, pick: (json: unknown) => T, initial: T, failed: T = initial) {
  let value = initial;
  let started = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const load = () => {
    if (started) return;
    started = true;
    fetch(url, { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        value = json ? pick(json) : failed;
        notify();
      })
      .catch(() => {
        value = failed;
        notify();
      });
  };
  return {
    load,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: () => value,
    initial: () => initial,
  };
}

// undefined until /api/me has answered, then the user or null (signed out)
const meStore = createStore<Me | undefined>("/api/me", (json) => (json as { user: Me }).user ?? null, undefined, null);
const EMPTY: ClosedDay[] = [];
const closuresStore = createStore<ClosedDay[]>(
  "/api/closures",
  (json) => (json as { closures: ClosedDay[] }).closures ?? EMPTY,
  EMPTY,
);

function useStore<T>(store: ReturnType<typeof createStore<T>>) {
  useEffect(() => store.load(), [store]);
  return useSyncExternalStore(store.subscribe, store.get, store.initial);
}

export const useAccount = () => useStore(meStore);
export const useClosures = () => useStore(closuresStore);
