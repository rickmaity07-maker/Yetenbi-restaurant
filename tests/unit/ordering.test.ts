import { describe, expect, it } from "vitest";
import type { Catalog } from "@/lib/menu";
import {
  canMove,
  DEFAULT_SETTINGS,
  mergeCartLines,
  orderWindow,
  totals,
  validateOrder,
  type OrderInput,
  type OrderSettings,
} from "@/lib/ordering";

// Berlin is UTC+2 in mid-October 2026. 2026-10-12 is a Monday (open 11:00–22:00),
// 2026-10-14 a Wednesday (open 16:00–22:00).
const berlin = (date: string, time: string) => new Date(`${date}T${time}:00+02:00`);
const MONDAY_NOON = berlin("2026-10-12", "12:00");

const catalog = new Map([
  ["kitfo", { price: 15.5, deposit: 0 }],
  ["cola", { price: 3.2, deposit: 0.25 }],
]) as unknown as Catalog;

const settings: OrderSettings = { ...DEFAULT_SETTINGS, minOrder: 15, deliveryFee: 2.5, freeDeliveryFrom: 40 };

const order = (changes: Partial<OrderInput> = {}): OrderInput => ({
  method: "delivery",
  items: [{ id: "kitfo", qty: 1 }],
  name: "Abebe Bikila",
  phone: "0931 123456",
  email: "gast@example.com",
  street: "Theaterstraße 1",
  postcode: "97070",
  city: "Würzburg",
  addressNote: "",
  note: "",
  payment: "cash",
  wanted: "asap",
  ...changes,
});

describe("totals", () => {
  it("adds food, deposit and the delivery fee", () => {
    const prices = totals(
      [
        { id: "kitfo", qty: 2 },
        { id: "cola", qty: 2 },
      ],
      "delivery",
      settings,
      catalog,
    );
    expect(prices).toEqual({ subtotal: 37.4, deposit: 0.5, fee: 2.5, total: 40.4 });
  });

  it("delivers free from the threshold, counting food only", () => {
    expect(totals([{ id: "kitfo", qty: 3 }], "delivery", settings, catalog).fee).toBe(0);
  });

  it("charges no delivery fee for pickup", () => {
    expect(totals([{ id: "kitfo", qty: 1 }], "pickup", settings, catalog).fee).toBe(0);
  });
});

describe("orderWindow", () => {
  it("is open with 'as soon as possible' during opening hours", () => {
    const window = orderWindow("delivery", settings, false, MONDAY_NOON);
    expect(window.open).toBe(true);
    expect(window.asap).toBe(true);
    expect(window.slots[0]).toBe("12:45"); // now + 45 minutes, rounded up to the quarter hour
    expect(window.slots.at(-1)).toBe("21:45"); // 15 minutes before closing
  });

  it("stops taking orders 30 minutes before closing", () => {
    expect(orderWindow("pickup", settings, false, berlin("2026-10-12", "21:31")).open).toBe(false);
  });

  it("offers only later times before opening", () => {
    const window = orderWindow("pickup", settings, false, berlin("2026-10-14", "12:00"));
    expect(window.asap).toBe(false);
    expect(window.slots[0]).toBe("16:30"); // opening + 20 minutes pickup time, rounded up
  });

  it("is closed when paused or on a closed day", () => {
    expect(orderWindow("delivery", { ...settings, paused: true }, false, MONDAY_NOON).open).toBe(false);
    expect(orderWindow("delivery", settings, true, MONDAY_NOON).open).toBe(false);
  });

  it("takes orders at night when hours are ignored", () => {
    const window = orderWindow("pickup", { ...settings, ignoreHours: true }, false, berlin("2026-10-12", "23:00"));
    expect(window).toEqual({ open: true, asap: true, slots: ["23:30", "23:45"] });
  });
});

describe("validateOrder", () => {
  const check = (input: OrderInput, now = MONDAY_NOON) => validateOrder(input, settings, catalog, false, now);

  it("accepts a valid order", () => {
    expect(check(order())).toEqual({});
  });

  it("rejects unknown dishes and impossible quantities", () => {
    expect(check(order({ items: [{ id: "nope", qty: 1 }] })).items).toBe("item");
    expect(check(order({ items: [{ id: "kitfo", qty: 21 }] })).items).toBe("item");
    expect(check(order({ items: [{ id: "kitfo", qty: 1.5 }] })).items).toBe("item");
    expect(check(order({ items: [] })).items).toBe("empty");
  });

  it("enforces the minimum order and the delivery area for delivery only", () => {
    expect(check(order({ items: [{ id: "cola", qty: 1 }] })).items).toBe("min");
    expect(check(order({ postcode: "12345" })).postcode).toBe("postcode");
    expect(check(order({ method: "pickup", postcode: "12345", items: [{ id: "cola", qty: 1 }] }))).toEqual({});
  });

  it("checks name, phone, email and note length", () => {
    const errors = check(order({ name: "A", phone: "12", email: "kein-mail", note: "x".repeat(401) }));
    expect(errors).toMatchObject({ name: "name", phone: "phone", email: "email", note: "note" });
  });

  it("rejects a time that is not offered", () => {
    expect(check(order({ wanted: "03:00" })).wanted).toBe("time");
    expect(check(order(), berlin("2026-10-12", "23:00")).wanted).toBe("closed");
  });
});

describe("mergeCartLines", () => {
  it("adds up the same dish sent twice", () => {
    const lines = [
      { id: "kitfo", qty: 20 },
      { id: "kitfo", qty: 20 },
      { id: "cola", qty: 1 },
    ];
    expect(mergeCartLines(lines)).toEqual([
      { id: "kitfo", qty: 40 },
      { id: "cola", qty: 1 },
    ]);
  });
});

describe("canMove", () => {
  it("lets each role take only its own steps", () => {
    expect(canMove("kitchen", "accepted", "cooked", "delivery")).toBe(true);
    expect(canMove("kitchen", "new", "accepted", "delivery")).toBe(false);
    expect(canMove("driver", "on_the_way", "completed", "delivery")).toBe(true);
    expect(canMove("driver", "packed", "on_the_way", "delivery")).toBe(false);
  });

  it("sends packed orders on the road or to the counter depending on the method", () => {
    expect(canMove("owner", "packed", "on_the_way", "delivery")).toBe(true);
    expect(canMove("owner", "packed", "ready", "delivery")).toBe(false);
    expect(canMove("owner", "packed", "ready", "pickup")).toBe(true);
  });

  it("only cancels orders that were already accepted", () => {
    expect(canMove("owner", "new", "cancelled", "pickup")).toBe(false);
    expect(canMove("owner", "cooked", "cancelled", "pickup")).toBe(true);
    expect(canMove("owner", "completed", "cancelled", "pickup")).toBe(false);
  });
});
