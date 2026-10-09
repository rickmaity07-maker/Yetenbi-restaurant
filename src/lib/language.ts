"use client";

import { useEffect, useSyncExternalStore } from "react";
import { content, DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "yt-locale";
const CHANGE_EVENT = "yt-locale-change";

/* Used when storage is unavailable (private windows), so the switch still works for the visit. */
let memory: Locale | null = null;

function read(): Locale {
  if (memory) return memory;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return (LOCALES as readonly string[]).includes(saved ?? "") ? (saved as Locale) : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function setLocale(locale: Locale) {
  memory = locale;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage blocked: the in-memory value above still applies
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/* The server renders German; a saved English or Amharic preference takes over after hydration. */
export function useLanguage() {
  const locale = useSyncExternalStore(subscribe, read, () => DEFAULT_LOCALE);
  return { locale, t: content[locale] };
}

/* Keeps <html lang> in step with the switch, for screen readers and translation tools. */
export function useHtmlLang() {
  const { locale } = useLanguage();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
}
