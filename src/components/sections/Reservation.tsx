"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle, Minus, Plus, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { restaurant } from "@/lib/data";
import { reservationLink, timeSlots, todayISO, validate, type Reservation as R, type ReservationErrors } from "@/lib/reservation";
import Embers from "../motion/Embers";
import { ease, Heading, Rise } from "../ui/primitives";
import { AksumFrame, LalibelaCross, Tibeb } from "../heritage/Ornaments";

const input =
  "w-full border-0 border-b bg-transparent px-0 pb-3 pt-1 font-display text-2xl text-cream placeholder:text-cream/30 transition-colors duration-500 focus:outline-none [color-scheme:dark]";
const line = (err?: string) => (err ? "border-[#f0a080]/70" : "border-gold/30 focus:border-gold");

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">
        {label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p id={`${id}-error`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm text-[#f0a080]">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const ticketDate = (iso: string) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" }) : "noch offen";

/** The ticket mirrors the form as you type. */
function Ticket({ form }: { form: R }) {
  const cells = [
    { k: "Datum", v: ticketDate(form.date) },
    { k: "Uhrzeit", v: form.time ? `${form.time} Uhr` : "noch offen" },
    { k: "Name", v: form.name.trim() || "noch offen" },
    { k: "Telefon", v: form.phone.trim() || "noch offen" },
  ];
  return (
    <AksumFrame>
      <div className="relative bg-coal bg-[radial-gradient(ellipse_at_top,rgba(201,162,74,0.16),transparent_65%)]">
        <Tibeb className="absolute inset-x-0 top-0 opacity-70" />
        <div className="px-7 pb-6 pt-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-2xl font-bold tracking-[0.2em] text-gold-soft">YETENBI</p>
              <p className="text-[0.6rem] uppercase tracking-[0.4em] text-cream/55">Restaurant & Café</p>
            </div>
            <LalibelaCross className="h-10 w-10 text-gold" />
          </div>
          <p className="mt-8 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-cream/55">Ein Tisch für</p>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={form.guests}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className="font-display text-7xl font-semibold leading-none text-cream"
            >
              {form.guests}
            </motion.p>
          </AnimatePresence>
        </div>
        <div aria-hidden className="relative h-6">
          <span className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-ink ring-1 ring-gold/30" />
          <span className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-ink ring-1 ring-gold/30" />
          <span className="absolute inset-x-5 top-1/2 border-t border-dashed border-gold/40" />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-7 pb-8 pt-4">
          {cells.map((c) => (
            <div key={c.k} className="min-w-0">
              <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-cream/55">{c.k}</dt>
              <dd className={`mt-1 truncate font-display text-lg ${c.v === "noch offen" ? "italic text-cream/45" : "text-cream"}`}>{c.v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center justify-between border-t border-gold/20 px-7 py-4 text-xs text-cream/55">
          <span>{restaurant.street}</span>
          <span>Würzburg</span>
        </div>
      </div>
    </AksumFrame>
  );
}

export default function Reservation() {
  const reduce = useReducedMotion();
  const [form, setForm] = useState<R>({ name: "", phone: "", date: "", time: "19:00", guests: 2, note: "" });
  const [errors, setErrors] = useState<ReservationErrors>({});
  const [sent, setSent] = useState(false);
  const [minDate, setMinDate] = useState<string>();

  // "Today" is only known in the browser; the static prerender must not depend on it.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMinDate(todayISO()), []);

  const set = <K extends keyof R>(key: K, value: R[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    window.open(reservationLink(form), "_blank", "noopener,noreferrer");
    setSent(true);
  };

  return (
    <section id="reservieren" className="relative overflow-hidden py-32 md:py-44 [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
      <div className="pointer-events-none absolute right-[10%] top-[35%] h-[80vmin] w-[80vmin] rounded-full bg-[radial-gradient(circle,rgba(201,162,74,0.18),rgba(218,90,26,0.06)_45%,transparent_70%)]" />
      <Embers count={16} />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Heading label="Reservierung" title="Reserviert euch einen Platz" em="an der Platte." size="md" />

        <div className="mt-16 grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="sent"
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease }}
                  role="status"
                  className="flex min-h-[420px] flex-col justify-center"
                >
                  <CheckCircle size={52} weight="thin" className="text-gold-soft" />
                  <h3 className="mt-6 font-display text-5xl font-semibold text-cream">Fast geschafft.</h3>
                  <p className="mt-4 max-w-md font-display text-2xl italic leading-snug text-cream/85">
                    Sendet die vorbereitete Nachricht in WhatsApp ab. Wir melden uns mit einer Bestätigung.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-6 text-sm">
                    <a
                      href={reservationLink(form)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-gold-soft underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
                    >
                      <WhatsappLogo size={18} /> WhatsApp erneut öffnen
                    </a>
                    <button type="button" onClick={() => setSent(false)} className="text-cream/72 underline decoration-cream/20 underline-offset-4 hover:text-cream">
                      Anfrage bearbeiten
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" noValidate onSubmit={submit} initial={false} exit={{ opacity: 0, y: -12 }} className="grid gap-x-10 gap-y-10 md:grid-cols-2">
                  <Field id="res-name" label="Name" error={errors.name}>
                    <input
                      id="res-name"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? "res-name-error" : undefined}
                      className={`${input} ${line(errors.name)}`}
                      placeholder="Euer Name"
                    />
                  </Field>
                  <Field id="res-phone" label="Telefon" error={errors.phone}>
                    <input
                      id="res-phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? "res-phone-error" : undefined}
                      className={`${input} ${line(errors.phone)}`}
                      placeholder="0176 1234567"
                    />
                  </Field>
                  <Field id="res-date" label="Datum" error={errors.date}>
                    <input
                      id="res-date"
                      type="date"
                      min={minDate}
                      value={form.date}
                      onChange={(e) => set("date", e.target.value)}
                      aria-invalid={!!errors.date}
                      aria-describedby={errors.date ? "res-date-error" : undefined}
                      className={`${input} ${line(errors.date)}`}
                    />
                  </Field>
                  <Field id="res-time" label="Uhrzeit" error={errors.time}>
                    <select
                      id="res-time"
                      value={form.time}
                      onChange={(e) => set("time", e.target.value)}
                      className={`${input} ${line(errors.time)} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2212%22%20height=%2212%22%20viewBox=%220%200%2012%2012%22%3E%3Cpath%20d=%22M2%204l4%204%204-4%22%20fill=%22none%22%20stroke=%22%23c9a24a%22%20stroke-width=%221.5%22/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_4px_center] bg-no-repeat`}
                    >
                      {timeSlots.map((t) => (
                        <option key={t} value={t} className="bg-coal text-base">
                          {t} Uhr
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="res-guests" label="Personen" error={errors.guests}>
                    <div className="flex items-center justify-between border-b border-gold/30 pb-2">
                      <button
                        type="button"
                        aria-label="Eine Person weniger"
                        onClick={() => set("guests", Math.max(1, form.guests - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-gold-soft transition-colors hover:bg-gold hover:text-ink active:scale-95"
                      >
                        <Minus size={16} />
                      </button>
                      <output id="res-guests" aria-live="polite" className="font-display text-3xl tabular-nums text-cream">
                        {form.guests}
                      </output>
                      <button
                        type="button"
                        aria-label="Eine Person mehr"
                        onClick={() => set("guests", Math.min(20, form.guests + 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-gold-soft transition-colors hover:bg-gold hover:text-ink active:scale-95"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </Field>
                  <Field id="res-note" label="Anmerkung (optional)">
                    <input
                      id="res-note"
                      value={form.note}
                      onChange={(e) => set("note", e.target.value)}
                      className={`${input} border-gold/30 focus:border-gold`}
                      placeholder="z. B. Kaffeezeremonie"
                    />
                  </Field>
                  <div className="flex flex-col items-start gap-4 md:col-span-2">
                    <button type="submit" className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gold px-8 py-4 font-semibold text-ink active:scale-[0.98]">
                      <span className="absolute inset-0 -translate-x-full bg-cream transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0" />
                      <span className="relative">Tisch reservieren</span>
                      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 transition-transform duration-500 group-hover:translate-x-1">
                        <ArrowRight size={14} weight="bold" />
                      </span>
                    </button>
                    <p className="flex items-center gap-2 text-xs text-cream/55">
                      <WhatsappLogo size={14} /> Die Anfrage geht per WhatsApp an uns. Oder ruft an: {restaurant.phone}
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <Rise className="lg:col-span-5" delay={0.15}>
            <div className="lg:sticky lg:top-28">
              <Ticket form={form} />
            </div>
          </Rise>
        </div>
      </div>
    </section>
  );
}
