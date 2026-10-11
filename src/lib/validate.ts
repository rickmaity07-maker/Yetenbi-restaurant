/*
  Checks shared by browser and server.
*/

/**
  One plain address: no spaces, commas, semicolons, angle brackets or quotes. These would let one form field
  name several recipients ("a@x.de, b@y.de") and turn the site's emails into a spam relay.
*/
export const isEmail = (value: string) =>
  value.length <= 120 && /^[^\s@,;<>"'()\\]+@[^\s@,;<>"'()\\]+\.[^\s@,;<>"'()\\]+$/.test(value);

/**
  A path on this site to return to after signing in, or "". Refuses other sites, including the tricks
  "//evil.com" and "/\evil.com" (browsers read a backslash as a slash) and control characters.
*/
export function safeNext(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || /[\u0000-\u001f\\]/.test(value))
    return "";
  return value.length <= 300 ? value : "";
}
