"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { useLanguage } from "@/lib/language";

/** "← Back to the home page", shown after an order or a reservation is done. */
export default function BackHomeLink({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2 rounded-full border border-gold/50 px-5 py-2.5 text-sm font-semibold text-gold-soft transition-colors hover:bg-gold hover:text-ink ${className}`}
    >
      <ArrowLeft size={16} className="transition-transform duration-500 group-hover:-translate-x-1" />
      {t.backHome}
    </Link>
  );
}
