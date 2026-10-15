import type { MetadataRoute } from "next";
import { ONLINE_ORDERING } from "@/lib/features";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  return [
    { url, changeFrequency: "weekly", priority: 1 },
    ...(ONLINE_ORDERING ? [{ url: `${url}/bestellen`, changeFrequency: "weekly" as const, priority: 0.8 }] : []),
    { url: `${url}/impressum`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${url}/datenschutz`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${url}/bestellbedingungen`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
