import { restaurant } from "@/lib/data";
import type { Menu } from "@/lib/menu";
import { SCHEMA_DAYS, type DayHours } from "@/lib/hours";
import { siteUrl } from "@/lib/site-url";

/** schema.org Restaurant data for search engines: address, hours, menu with prices, reservations. */
export default function StructuredData({ menu, hours }: { menu: Menu; hours: DayHours[] }) {
  const url = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Yetenbi Äthiopisches Restaurant & Café",
    alternateName: "የተንቢ",
    url,
    image: `${url}/opengraph-image`,
    telephone: restaurant.phoneIntl,
    servesCuisine: ["Ethiopian", "Äthiopisch", "Vegan"],
    priceRange: "€€",
    acceptsReservations: true,
    address: {
      "@type": "PostalAddress",
      streetAddress: restaurant.street,
      postalCode: restaurant.postalCode,
      addressLocality: restaurant.locality,
      addressCountry: "DE",
    },
    geo: { "@type": "GeoCoordinates", latitude: restaurant.geo.lat, longitude: restaurant.geo.lng },
    openingHoursSpecification: hours.flatMap((day, index) =>
      day
        ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: SCHEMA_DAYS[index], opens: day.open, closes: day.close }]
        : [],
    ),
    hasMenu: {
      "@type": "Menu",
      inLanguage: "de",
      hasMenuSection: menu
        .filter((category) => category.items.length)
        .map((category) => ({
          "@type": "MenuSection",
          name: category.title.de,
          hasMenuItem: category.items.map((item) => ({
            "@type": "MenuItem",
            name: item.name.de,
            ...(item.description ? { description: item.description.de } : {}),
            offers: { "@type": "Offer", price: item.price.toFixed(2), priceCurrency: "EUR" },
            ...(item.tags.includes("vegan") ? { suitableForDiet: "https://schema.org/VeganDiet" } : {}),
          })),
        })),
    },
  };
  // JSON.stringify output with "<" escaped cannot break out of the script tag.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
