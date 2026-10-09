"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bag, Minus, Moped, Plus, Storefront } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { menu } from "@/lib/data";
import { formatEuro, ORDERABLE, totals, validateOrder, type CartLine, type Method, type OrderErrors, type OrderInput, type OrderSettings, type Payment } from "@/lib/ordering";
import { useLanguage } from "@/lib/language";
import { useAccount } from "@/lib/account-client";
import { fieldClass } from "@/components/account/AccountShell";

type Window = { open: boolean; asap: boolean; slots: string[] };
type Availability = { available: boolean; settings: OrderSettings; closedToday?: boolean; delivery?: Window; pickup?: Window };

const CART_KEY = "yt-cart";
const readCart = (): CartLine[] => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]") as CartLine[];
    return raw.filter((l) => ORDERABLE.some((i) => i.id === l.id) && l.qty > 0);
  } catch {
    return [];
  }
};

function Stepper({ qty, onChange, less, more }: { qty: number; onChange: (q: number) => void; less: string; more: string }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={less} onClick={() => onChange(qty - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-gold-soft hover:bg-gold hover:text-ink">
        <Minus size={14} />
      </button>
      <span className="w-5 text-center font-display text-xl tabular-nums text-cream" aria-live="polite">
        {qty}
      </span>
      <button type="button" aria-label={more} onClick={() => onChange(qty + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-gold-soft hover:bg-gold hover:text-ink">
        <Plus size={14} />
      </button>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-[#f0a080]">
          {error}
        </p>
      )}
    </div>
  );
}

export default function OrderView() {
  const { t, locale } = useLanguage();
  const o = t.order;
  const router = useRouter();
  const me = useAccount();
  const [info, setInfo] = useState<Availability | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [category, setCategory] = useState(menu[0].id);
  const [method, setMethod] = useState<Method>("delivery");
  const [payment, setPayment] = useState<Payment>("cash");
  const [wanted, setWanted] = useState("asap");
  const [form, setForm] = useState({ name: "", phone: "", email: "", street: "", postcode: "", city: "Würzburg", addressNote: "", note: "" });
  const [errors, setErrors] = useState<OrderErrors>({});
  const [serverError, setServerError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  // Cart lives in this browser only, so a reload does not empty it.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCart(readCart()), []);
  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // storage blocked: the cart still works for this visit
    }
  }, [cart]);

  useEffect(() => {
    fetch("/api/ordering", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Availability) => {
        setInfo(d);
        if (d.settings && !d.settings.delivery && d.settings.pickup) setMethod("pickup");
      })
      .catch(() => setInfo({ available: false, settings: {} as OrderSettings }));
  }, []);

  useEffect(() => {
    if (!me) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((f) => ({ ...f, name: f.name || me.name, phone: f.phone || me.phone, email: f.email || me.email }));
  }, [me]);

  const s = info?.settings;
  const win = info ? info[method] : undefined;
  const euro = (n: number) => formatEuro(n, t.dateLocale);
  const sum = useMemo(() => (s ? totals(cart, method, s) : { subtotal: 0, fee: 0, total: 0 }), [cart, method, s]);
  const count = cart.reduce((n, l) => n + l.qty, 0);
  const qtyOf = (id: string) => cart.find((l) => l.id === id)?.qty ?? 0;
  const setQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.some((l) => l.id === id) ? c.map((l) => (l.id === id ? { ...l, qty: Math.min(20, qty) } : l)) : [...c, { id, qty: 1 }]));

  // keep the chosen time valid when the window changes
  useEffect(() => {
    if (!win) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWanted((w) => (w === "asap" ? (win.asap ? "asap" : (win.slots[0] ?? "asap")) : win.slots.includes(w) ? w : win.asap ? "asap" : (win.slots[0] ?? "asap")));
  }, [win]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setServerError(undefined);
  };

  const canOrder = Boolean(info?.available && s && !s.paused && win?.open && (method === "delivery" ? s.delivery : s.pickup));
  const err = (code?: keyof typeof o.errors) => (code ? o.errors[code] : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s) return;
    const input: OrderInput = { method, items: cart, payment, wanted, ...form };
    const found = validateOrder(input, s, info?.closedToday);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSending(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, locale, website: honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) {
        setCart([]);
        router.push(data.statusUrl);
      } else if (res.status === 422 && data.errors) setErrors(data.errors);
      else if (res.status === 429) setServerError(o.errors.busy);
      else setServerError(o.errors.server);
    } catch {
      setServerError(o.errors.server);
    } finally {
      setSending(false);
    }
  };

  const items = ORDERABLE.filter((i) => i.categoryId === category);
  const categories = menu.filter((c) => ORDERABLE.some((i) => i.categoryId === c.id));

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold leading-[1.05] text-cream md:text-6xl">{o.title}</h1>
      <p className="mt-3 font-display text-xl italic text-cream/75 md:text-2xl">{o.lead}</p>

      {info && (!info.available || s?.paused || !win?.open) && (
        <p role="status" className="mt-8 border-l-2 border-[#f0a080] pl-4 text-cream/85">
          {!info.available ? o.unavailable : s?.paused ? o.paused : o.closed}
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        {/* Menu */}
        <div className="lg:col-span-7">
          <div role="tablist" aria-label={t.menu.categories} className="-mx-1 flex flex-wrap gap-x-6 gap-y-3 border-b border-gold/20 pb-3">
            {categories.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={category === c.id}
                onClick={() => setCategory(c.id)}
                className={`px-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] ${category === c.id ? "text-gold-soft" : "text-cream/50 hover:text-cream/80"}`}
              >
                {c.title[locale]}
              </button>
            ))}
          </div>
          {category === "kaffee" && <p className="mt-5 text-sm italic text-cream/65">{o.ceremony}</p>}
          <ul className="mt-6 divide-y divide-cream/10">
            {items.map((item) => {
              const q = qtyOf(item.id);
              return (
                <li key={item.id} className="flex items-start justify-between gap-6 py-5">
                  <div className="min-w-0">
                    <p className="font-display text-xl text-cream md:text-2xl">{item.name[locale]}</p>
                    {item.amharic && (
                      <p lang="am" className="font-ethiopic text-[13px] text-gold/65">
                        {item.amharic}
                      </p>
                    )}
                    {item.description && <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-cream/60">{item.description[locale]}</p>}
                    <p className="mt-2 font-display text-lg text-gold-soft">{euro(item.price)}</p>
                  </div>
                  <div className="shrink-0 pt-1">
                    {q === 0 ? (
                      <button
                        type="button"
                        onClick={() => setQty(item.id, 1)}
                        className="rounded-full border border-gold/60 px-4 py-2 text-sm font-semibold text-gold-soft transition-colors hover:bg-gold hover:text-ink"
                      >
                        {o.add}
                      </button>
                    ) : (
                      <Stepper qty={q} onChange={(n) => setQty(item.id, n)} less={o.less} more={o.more} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Cart + checkout */}
        <form id="checkout" onSubmit={submit} noValidate className="lg:col-span-5">
          <div className="space-y-8 lg:sticky lg:top-8">
            <div className="grid grid-cols-2 gap-2 rounded-full border border-gold/30 p-1">
              {(["delivery", "pickup"] as const).map((m) => {
                const disabled = s ? (m === "delivery" ? !s.delivery : !s.pickup) : false;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    aria-pressed={method === m}
                    onClick={() => setMethod(m)}
                    className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
                      method === m ? "bg-gold text-ink" : "text-cream/75 hover:text-cream"
                    }`}
                  >
                    {m === "delivery" ? <Moped size={18} /> : <Storefront size={18} />}
                    {m === "delivery" ? o.delivery : o.pickup}
                  </button>
                );
              })}
            </div>

            {s && (
              <p className="text-xs leading-relaxed text-cream/60">
                {method === "delivery" ? (
                  <>
                    {o.minOrder(euro(s.minOrder))}
                    {s.freeDeliveryFrom > 0 && <> · {o.freeFrom(euro(s.freeDeliveryFrom))}</>}
                    <br />
                    {o.area(s.postcodes.join(", "))}
                  </>
                ) : (
                  o.pickupAt
                )}
              </p>
            )}

            {/* Basket */}
            <div className="border border-gold/25 bg-ink/40 p-5">
              <p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold">
                <Bag size={16} /> {o.cart} {count > 0 && `(${count})`}
              </p>
              {cart.length === 0 ? (
                <p className="mt-4 font-display text-lg italic text-cream/60">{o.empty}</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {cart.map((l) => {
                    const item = ORDERABLE.find((i) => i.id === l.id)!;
                    return (
                      <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-cream">
                          {l.qty} × {item.name[locale]}
                        </span>
                        <span className="tabular-nums text-cream/80">{euro(item.price * l.qty)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <dl className="mt-4 space-y-1 border-t border-gold/20 pt-4 text-sm">
                <div className="flex justify-between text-cream/75">
                  <dt>{o.subtotal}</dt>
                  <dd className="tabular-nums">{euro(sum.subtotal)}</dd>
                </div>
                {method === "delivery" && (
                  <div className="flex justify-between text-cream/75">
                    <dt>{o.deliveryFee}</dt>
                    <dd className="tabular-nums">{sum.fee ? euro(sum.fee) : o.free}</dd>
                  </div>
                )}
                <div className="flex justify-between pt-1 font-display text-2xl text-gold-soft">
                  <dt>{o.total}</dt>
                  <dd className="tabular-nums">{euro(sum.total)}</dd>
                </div>
              </dl>
              {err(errors.items) && <p className="mt-3 text-sm text-[#f0a080]">{err(errors.items)}</p>}
            </div>

            {/* When */}
            <Field id="wanted" label={o.when} error={err(errors.wanted)}>
              <select id="wanted" value={wanted} onChange={(e) => setWanted(e.target.value)} className={`${fieldClass} text-xl [color-scheme:dark]`} disabled={!win?.open}>
                {win?.asap && (
                  <option value="asap" className="bg-coal text-base">
                    {o.asap(method === "delivery" ? (s?.deliveryMinutes ?? 45) : (s?.pickupMinutes ?? 20))}
                  </option>
                )}
                {win?.slots.map((slot) => (
                  <option key={slot} value={slot} className="bg-coal text-base">
                    {o.later}: {t.clock(slot)}
                  </option>
                ))}
              </select>
            </Field>

            <AnimatePresence initial={false}>
              {method === "delivery" && (
                <motion.fieldset initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-6 overflow-hidden">
                  <legend className="mb-2 font-display text-2xl text-cream">{o.address}</legend>
                  <Field id="street" label={o.street} error={err(errors.street)}>
                    <input id="street" autoComplete="street-address" value={form.street} onChange={(e) => set("street", e.target.value)} className={`${fieldClass} text-xl`} />
                  </Field>
                  <div className="grid grid-cols-[0.8fr_1.2fr] gap-6">
                    <Field id="postcode" label={o.postcode} error={err(errors.postcode)}>
                      <input id="postcode" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={form.postcode} onChange={(e) => set("postcode", e.target.value)} className={`${fieldClass} text-xl`} />
                    </Field>
                    <Field id="city" label={o.city}>
                      <input id="city" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} className={`${fieldClass} text-xl`} />
                    </Field>
                  </div>
                  <Field id="addressNote" label={o.addressNote}>
                    <input id="addressNote" maxLength={200} value={form.addressNote} onChange={(e) => set("addressNote", e.target.value)} className={`${fieldClass} text-lg`} />
                  </Field>
                </motion.fieldset>
              )}
            </AnimatePresence>

            <fieldset className="space-y-6">
              <legend className="mb-2 font-display text-2xl text-cream">{o.contact}</legend>
              <Field id="name" label={o.name} error={err(errors.name)}>
                <input id="name" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} className={`${fieldClass} text-xl`} />
              </Field>
              <Field id="phone" label={o.phone} error={err(errors.phone)}>
                <input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={`${fieldClass} text-xl`} />
              </Field>
              <Field id="email" label={o.email} error={err(errors.email)}>
                <input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={`${fieldClass} text-xl`} />
              </Field>
              <Field id="note" label={o.note} error={err(errors.note)}>
                <input id="note" maxLength={400} value={form.note} onChange={(e) => set("note", e.target.value)} className={`${fieldClass} text-lg`} />
              </Field>
            </fieldset>

            <fieldset>
              <legend className="mb-3 font-display text-2xl text-cream">{o.payment}</legend>
              <div className="grid grid-cols-2 gap-3">
                {(["cash", "card"] as const).map((p) => (
                  <label key={p} className={`cursor-pointer rounded-full border px-4 py-2.5 text-center text-sm font-semibold transition-colors ${payment === p ? "border-gold bg-gold/15 text-gold-soft" : "border-cream/20 text-cream/70"}`}>
                    <input type="radio" name="payment" value={p} checked={payment === p} onChange={() => setPayment(p)} className="sr-only" />
                    {p === "cash" ? o.cash : o.card}
                  </label>
                ))}
              </div>
            </fieldset>

            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" />

            {serverError && (
              <p role="alert" className="text-sm text-[#f0a080]">
                {serverError}
              </p>
            )}
            <button
              type="submit"
              disabled={!canOrder || sending || cart.length === 0}
              className="group relative w-full overflow-hidden rounded-full bg-gold px-8 py-4 font-semibold text-ink active:scale-[0.99] disabled:opacity-50"
            >
              <span className="absolute inset-0 -translate-x-full bg-cream transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0" />
              <span className="relative">{sending ? o.placing : o.place(euro(sum.total))}</span>
            </button>
            <p className="text-center text-xs text-cream/50">
              <Link href="/datenschutz" className="underline underline-offset-4">
                {t.footer.privacy}
              </Link>
            </p>
          </div>
        </form>
      </div>

      {/* Mobile: jump to the basket */}
      {count > 0 && (
        <a
          href="#checkout"
          className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-full bg-gold px-6 py-3.5 font-semibold text-ink shadow-[0_20px_40px_-12px_rgba(0,0,0,0.7)] lg:hidden"
        >
          <span>
            {o.toCheckout} ({count})
          </span>
          <span className="tabular-nums">{euro(sum.total)}</span>
        </a>
      )}
    </div>
  );
}
