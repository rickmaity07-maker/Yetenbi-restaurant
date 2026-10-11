/*
  Small helpers for the Ethiopian calendar, clock and Ge'ez numerals.
  The calendar conversion goes through the Julian Day Number (Amete Mihret epoch 1723856).
*/

const ONES = ["", "፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"];
const TENS = ["", "፲", "፳", "፴", "፵", "፶", "፷", "፸", "፹", "፺"];

const below100 = (n: number) => TENS[Math.floor(n / 10)] + ONES[n % 10];

/** Ge'ez numeral for 1 to 9999 (e.g. 2019 → ፳፻፲፱). */
export function geez(n: number): string {
  if (n < 1 || n > 9999 || !Number.isInteger(n)) return String(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return below100(rest);
  return (hundreds > 1 ? below100(hundreds) : "") + "፻" + below100(rest);
}

export const MONTHS = [
  { de: "Meskerem", am: "መስከረም" },
  { de: "Tikimt", am: "ጥቅምት" },
  { de: "Hidar", am: "ኅዳር" },
  { de: "Tahsas", am: "ታኅሣሥ" },
  { de: "Tir", am: "ጥር" },
  { de: "Yekatit", am: "የካቲት" },
  { de: "Megabit", am: "መጋቢት" },
  { de: "Miyazya", am: "ሚያዝያ" },
  { de: "Ginbot", am: "ግንቦት" },
  { de: "Sene", am: "ሰኔ" },
  { de: "Hamle", am: "ሐምሌ" },
  { de: "Nehase", am: "ነሐሴ" },
  { de: "Pagume", am: "ጳጉሜን" },
];

const EPOCH = 1723856;

function gregorianToJdn(y: number, m: number, d: number) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** Ethiopian calendar date for a Gregorian year/month/day. */
function toEthiopian(y: number, m: number, d: number) {
  const jdn = gregorianToJdn(y, m, d);
  const r = (jdn - EPOCH) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

/** Current date and time in Addis Ababa (UTC+3, no daylight saving), with the Ethiopian hour count. */
export function addisNow(now = new Date()) {
  const addis = new Date(now.getTime() + 3 * 3600 * 1000);
  const h = addis.getUTCHours();
  const min = addis.getUTCMinutes();
  const date = toEthiopian(addis.getUTCFullYear(), addis.getUTCMonth() + 1, addis.getUTCDate());
  // Ethiopian hours start at sunrise: 7:00 is "1 o'clock in the day", 19:00 "1 o'clock in the night".
  const ethHour = ((h + 6) % 12) || 12;
  const daytime = h >= 6 && h < 18;
  return { date, h, min, ethHour, daytime };
}
