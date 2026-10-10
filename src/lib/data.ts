export const restaurant = {
  name: "Yetenbi",
  street: "Theaterstraße 6",
  postalCode: "97070",
  locality: "Würzburg",
  city: "97070 Würzburg",
  phone: "0176 21438960",
  phoneHref: "tel:+4917621438960",
  phoneIntl: "+49 176 21438960",
  geo: { lat: 49.7965532, lng: 9.9340858 },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=YETENBI+%C3%84thiopisches+Restaurant+Theaterstra%C3%9Fe+6+97070+W%C3%BCrzburg",
  mapsEmbed: "https://www.google.com/maps?q=Theaterstra%C3%9Fe+6,+97070+W%C3%BCrzburg&z=16&output=embed",
};

/** A piece of text in the three site languages. */
export type L = { de: string; en: string; am: string };

export type Tag = "special" | "spicy" | "mild" | "vegan" | "glutenfree";
