import { describe, expect, it } from "vitest";
import { addDays, slotsFor, validateBooking, whatsappLink, type BookingRequest } from "@/lib/booking";

const TODAY = "2026-10-12"; // a Monday

const booking = (changes: Partial<BookingRequest> = {}): BookingRequest => ({
  date: "2026-10-16",
  time: "19:00",
  guests: 4,
  name: "Abebe Bikila",
  email: "gast@example.com",
  phone: "0931 123456",
  note: "",
  ...changes,
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("slotsFor", () => {
  it("offers every half hour from opening until 90 minutes before closing", () => {
    const slots = slotsFor("2026-10-14"); // Wednesday, 16:00–22:00
    expect(slots[0]).toBe("16:00");
    expect(slots.at(-1)).toBe("20:30");
    expect(slots).toHaveLength(10);
  });

  it("offers nothing on a closed day or for a bad date", () => {
    expect(slotsFor("2026-10-14", ["2026-10-14"])).toEqual([]);
    expect(slotsFor("14.10.2026")).toEqual([]);
  });
});

describe("validateBooking", () => {
  it("accepts a valid request", () => {
    expect(validateBooking(booking(), TODAY)).toEqual({});
  });

  it("rejects past, far-away and closed dates", () => {
    expect(validateBooking(booking({ date: "2026-10-11" }), TODAY).date).toBe("past");
    expect(validateBooking(booking({ date: "2027-02-01" }), TODAY).date).toBe("far");
    expect(validateBooking(booking(), TODAY, ["2026-10-16"]).date).toBe("closed");
  });

  it("rejects a time outside the bookable slots", () => {
    expect(validateBooking(booking({ time: "21:30" }), TODAY).time).toBe("slot");
  });

  it("limits the party size", () => {
    expect(validateBooking(booking({ guests: 0 }), TODAY).guests).toBe("guests");
    expect(validateBooking(booking({ guests: 13 }), TODAY).guests).toBe("tooMany");
  });

  it("needs an email unless the team enters a phone booking", () => {
    expect(validateBooking(booking({ email: "" }), TODAY).email).toBe("email");
    expect(validateBooking(booking({ email: "" }), TODAY, [], { emailOptional: true })).toEqual({});
    expect(validateBooking(booking({ email: "kaputt" }), TODAY, [], { emailOptional: true }).email).toBe("email");
  });
});

describe("whatsappLink", () => {
  it("prepares a message with the booking details", () => {
    const text = decodeURIComponent(whatsappLink(booking(), "Freitag").split("text=")[1]);
    expect(text).toContain("Name: Abebe Bikila");
    expect(text).toContain("Datum: Freitag");
    expect(text).not.toContain("Anmerkung");
  });
});
