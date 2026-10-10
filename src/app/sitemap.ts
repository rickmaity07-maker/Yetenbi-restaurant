import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  return [
    { url, changeFrequency: "weekly", priority: 1 },
    { url: `${url}/bestellen`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${url}/impressum`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${url}/datenschutz`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${url}/bestellbedingungen`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
