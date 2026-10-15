import { describe, expect, it } from "vitest";
import { checkTotal, kitchenCounts, parseRound, validatePayment } from "@/lib/service";

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
      { itemId: "fleisch-0", qty: 2, note: "extra scharf" },
    ]);
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
