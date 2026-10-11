import { describe, expect, it } from "vitest";
import { groupedHours, openState, toMinutes, weekdayOf, WEEK } from "@/lib/hours";
import { isEmail, safeNext } from "@/lib/validate";
import { phoneKey } from "@/lib/server/order-guard";
import { escapeHtml } from "@/lib/server/email/html";

describe("opening hours", () => {
  it("reads weekdays Monday first", () => {
    expect(weekdayOf("2026-10-12")).toBe(0); // Monday
    expect(weekdayOf("2026-10-18")).toBe(6); // Sunday
  });

  it("converts clock times to minutes", () => {
    expect(toMinutes("18:30")).toBe(1110);
  });

  it("groups neighbouring days with the same hours", () => {
    expect(groupedHours(WEEK).map((row) => row.days)).toEqual([[0, 1], [2], [3, 4, 5], [6]]);
  });

  it("knows whether the restaurant is open and when it opens next", () => {
    expect(openState(new Date("2026-10-12T12:00:00+02:00"))).toEqual({ open: true, until: "22:00" });
    expect(openState(new Date("2026-10-14T12:00:00+02:00"))).toEqual({ open: false, day: 2, at: "16:00" });
    expect(openState(new Date("2026-10-12T23:00:00+02:00"))).toEqual({ open: false, day: 1, at: "11:00" });
  });
});

describe("isEmail", () => {
  it("accepts one plain address only", () => {
    expect(isEmail("gast@example.com")).toBe(true);
    expect(isEmail("a@x.de, b@y.de")).toBe(false); // several recipients would turn the site into a spam relay
    expect(isEmail("Name <gast@example.com>")).toBe(false);
    expect(isEmail("kein-mail")).toBe(false);
  });
});

describe("safeNext", () => {
  it("only allows paths on this site", () => {
    expect(safeNext("/bestellen")).toBe("/bestellen");
    expect(safeNext("//evil.example")).toBe("");
    expect(safeNext("/\\evil.example")).toBe("");
    expect(safeNext("https://evil.example")).toBe("");
  });
});

describe("phoneKey", () => {
  it("treats every way of typing the same number as one", () => {
    const key = "49176123456";
    expect(phoneKey("0176 123456")).toBe(key);
    expect(phoneKey("+49 176-123456")).toBe(key);
    expect(phoneKey("0049176123456")).toBe(key);
  });
});

describe("escapeHtml", () => {
  it("escapes what guests type before it goes into an email", () => {
    expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe("&#60;b&#62;&#34;x&#34; &#38; &#39;y&#39;&#60;/b&#62;");
  });
});
