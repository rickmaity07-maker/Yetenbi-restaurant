import type { NextConfig } from "next";

/*
  Content-Security-Policy: what the browser may load. Scripts, styles, fonts and map tiles only from this site;
  images also from Cloudinary (the owner's photos); connections also to Cloudinary's upload API; no frames.
  Inline scripts stay allowed because Next.js streams the page with them; a nonce would force every page to be
  rendered per request (see the "Content Security Policy" guide in node_modules/next/dist/docs).
  Previews also allow the Vercel toolbar; development also allows eval (React's dev tools need it).
*/
const isDev = process.env.NODE_ENV === "development";
const vercelToolbar = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${vercelToolbar}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self'",
  `connect-src 'self' https://api.cloudinary.com${vercelToolbar}`,
  vercelToolbar ? `frame-src${vercelToolbar}` : "frame-src 'none'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/*
  Security headers on every page: the policy above, no framing of the site (protects the admin page), no MIME
  sniffing, no full URLs leaking to other sites, and no camera/microphone/geolocation for embedded content.
*/
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
