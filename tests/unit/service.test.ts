import { describe, expect, it } from "vitest";
import {
  checkDue,
  checkTotal,
  CLIENT_KEY,
  kitchenCounts,
  parseRound,
  parseSplit,
  validatePayment,
} from "@/lib/service";

describe("checkTotal", () => {
  it("adds lines in cents and leaves voided lines out", () => {
    expect(
      checkTotal([
        { unit: 14.9, qty: 2, status: "served" },
        { unit: 3.3, qty: 3, status: "sent" },
        { unit: 99, qty: 1, status: "void" },
      ]),
    ).toBe(39.7);
  });
  it("is 0 for an empty check", () => expect(checkTotal([])).toBe(0));
});

describe("kitchenCounts", () => {
  it("counts food still cooking and food at the pass, ignoring drinks", () => {
    expect(
      kitchenCounts([
        { kitchen: true, status: "sent", qty: 2 },
        { kitchen: true, status: "ready", qty: 1 },
        { kitchen: false, status: "served", qty: 4 },
        { kitchen: true, status: "served", qty: 1 },
      ]),
    ).toEqual({ cooking: 2, ready: 1 });
  });
});

describe("parseRound", () => {
  it("accepts dish ids, quantities and trims notes", () => {
    expect(parseRound([{ itemId: "fleisch-0", qty: 2, note: "  extra scharf " }])).toEqual([
      { itemId: "fleisch-0", qty: 2, note: "extra scharf", seat: null, hold: false },
    ]);
  });
  it("takes a seat and 'later' for the kitchen", () => {
    expect(parseRound([{ itemId: "a", qty: 1, seat: 3, hold: true }])).toEqual([
      { itemId: "a", qty: 1, note: "", seat: 3, hold: true },
    ]);
    expect(parseRound([{ itemId: "a", qty: 1, seat: null }])![0].seat).toBeNull();
    expect(parseRound([{ itemId: "a", qty: 1, seat: 0 }])).toBeNull();
    expect(parseRound([{ itemId: "a", qty: 1, seat: "2" }])).toBeNull();
  });
  it("rejects empty rounds, bad quantities and odd ids", () => {
    expect(parseRound([])).toBeNull();
    expect(parseRound([{ itemId: "a", qty: 0 }])).toBeNull();
    expect(parseRound([{ itemId: "a", qty: 1.5 }])).toBeNull();
    expect(parseRound([{ itemId: "drop table", qty: 1 }])).toBeNull();
    expect(parseRound("x")).toBeNull();
  });
  it("cuts long notes", () => {
    expect(parseRound([{ itemId: "a", qty: 1, note: "x".repeat(500) }])![0].note).toHaveLength(140);
  });
});

describe("checkDue", () => {
  const items = [
    { unit: 14.9, qty: 2, status: "served" as const },
    { unit: 3.3, qty: 1, status: "void" as const },
  ];
  it("is the bill minus what was paid, in cents", () => {
    expect(checkDue(items, [])).toBe(29.8);
    expect(checkDue(items, [{ amount: 9.93 }, { amount: 9.93 }])).toBe(9.94);
    expect(checkDue(items, [{ amount: 29.8 }])).toBe(0);
  });
  it("never goes below 0", () => expect(checkDue(items, [{ amount: 50 }])).toBe(0));
});

describe("parseSplit", () => {
  it("takes lines with how many of each, or nothing for an amount-only part", () => {
    expect(parseSplit([{ id: 4, qty: 1 }])).toEqual([{ id: 4, qty: 1 }]);
    expect(parseSplit(undefined)).toEqual([]);
  });
  it("rejects odd ids, quantities and the same line twice", () => {
    expect(parseSplit([{ id: 0, qty: 1 }])).toBeNull();
    expect(parseSplit([{ id: 4, qty: 0 }])).toBeNull();
    expect(parseSplit([{ id: "4", qty: 1 }])).toBeNull();
    expect(
      parseSplit([
        { id: 4, qty: 1 },
        { id: 4, qty: 1 },
      ]),
    ).toBeNull();
    expect(parseSplit("x")).toBeNull();
  });
});

describe("CLIENT_KEY", () => {
  it("accepts the app's random keys only", () => {
    expect(CLIENT_KEY.test("aB3_-xYz0123456789")).toBe(true);
    expect(CLIENT_KEY.test("short")).toBe(false);
    expect(CLIENT_KEY.test("has space in it 1234")).toBe(false);
  });
});

describe("validatePayment", () => {
  it("takes card with tip", () => {
    expect(validatePayment(30, { method: "card", tip: 2.5 })).toEqual({ method: "card", tip: 2.5, given: null });
  });
  it("needs enough cash for bill and tip", () => {
    expect(validatePayment(30, { method: "cash", tip: 2, given: 50 })).toEqual({ method: "cash", tip: 2, given: 50 });
    expect(validatePayment(30, { method: "cash", tip: 2, given: 31 })).toEqual({ error: "given_too_low" });
  });
  it("rejects unknown methods and negative tips", () => {
    expect(validatePayment(30, { method: "bitcoin" })).toEqual({ error: "method_invalid" });
    expect(validatePayment(30, { method: "card", tip: -1 })).toEqual({ error: "tip_invalid" });
  });
});
