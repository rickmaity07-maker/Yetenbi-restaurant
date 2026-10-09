"use client";

import { useEffect, useSyncExternalStore } from "react";

/*
  Tiny shared stores for the public page: who is signed in (/api/me) and upcoming closed days
  (/api/closures). Each is fetched once per page load, however many components ask for it.
*/

export type Me = { name: string; email: string; phone: string; role: "guest" | "owner" } | null;
export type ClosedDay = { date: string; note: string };

function createStore<T>(url: string, pick: (json: unknown) => T, initial: T) {
  let value = initial;
  let started = false;
  const listeners = new Set<() => void>();
  const load = () => {
    if (started) return;
    started = true;
    fetch(url, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) {
          value = pick(json);
          listeners.forEach((l) => l());
        }
      })
      .catch(() => {});
  };
  return {
    load,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get: () => value,
    initial: () => initial,
  };
}

const meStore = createStore<Me>("/api/me", (j) => (j as { user: Me }).user ?? null, null);
const EMPTY: ClosedDay[] = [];
const closuresStore = createStore<ClosedDay[]>("/api/closures", (j) => (j as { closures: ClosedDay[] }).closures ?? EMPTY, EMPTY);

function useStore<T>(store: ReturnType<typeof createStore<T>>) {
  useEffect(() => store.load(), [store]);
  return useSyncExternalStore(store.subscribe, store.get, store.initial);
}

export const useAccount = () => useStore(meStore);
export const useClosures = () => useStore(closuresStore);
