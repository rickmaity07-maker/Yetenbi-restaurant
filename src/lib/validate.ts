/*
  Checks shared by browser and server.
*/

/**
  One plain address: no spaces, commas, semicolons, angle brackets or quotes. These would let one form field
  name several recipients ("a@x.de, b@y.de") and turn the site's emails into a spam relay.
*/
export const isEmail = (v: string) =>
  v.length <= 120 && /^[^\s@,;<>"'()\\]+@[^\s@,;<>"'()\\]+\.[^\s@,;<>"'()\\]+$/.test(v);

/**
  A path on this site to return to after signing in, or "". Refuses other sites, including the tricks
  "//evil.com" and "/\evil.com" (browsers read a backslash as a slash) and control characters.
*/
export function safeNext(v: string) {
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || /[\u0000-\u001f\\]/.test(v)) return "";
  return v.length <= 300 ? v : "";
}
