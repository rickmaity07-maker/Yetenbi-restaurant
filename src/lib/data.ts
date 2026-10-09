export const restaurant = {
  name: "Yetenbi",
  tagline: "Restaurant & Café",
  subtitle: "Authentisch Äthiopisch",
  street: "Theaterstraße 6",
  city: "97070 Würzburg",
  phone: "0176 21438960",
  phoneHref: "tel:+4917621438960",
  priceRange: "10-20 € pro Person",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=YETENBI+%C3%84thiopisches+Restaurant+Theaterstra%C3%9Fe+6+97070+W%C3%BCrzburg",
  mapsEmbed:
    "https://www.google.com/maps?q=Theaterstra%C3%9Fe+6,+97070+W%C3%BCrzburg&z=16&output=embed",
};

// TODO: Only "opens 11:00 on Friday" is confirmed. Check these with the restaurant.
export const openingHours = [
  { day: "Montag bis Sonntag", time: "ab 11:00 Uhr" },
];

export type MenuItem = {
  name: string;
  amharic?: string;
  description?: string;
  price: string;
  tags?: ("vegan" | "vegetarisch" | "glutenfrei" | "scharf" | "mild" | "Spezialität")[];
};

export type MenuCategory = {
  id: string;
  title: string;
  note?: string;
  items: MenuItem[];
};

export const menu: MenuCategory[] = [
  {
    id: "fleisch",
    title: "Hauptgerichte",
    note: "Alle Hauptspeisen werden mit Injera serviert, dem weichen, leicht säuerlichen Fladenbrot aus Teff und Grundlage jedes äthiopischen Gerichts.",
    items: [
      {
        name: "Yetenbi Kitfo",
        amharic: "የተንቢ ክትፎ",
        description:
          "Nach Gurage-Art: gehacktes Rindfleisch mit gewürzter, spezieller Butter.",
        price: "18,00",
        tags: ["Spezialität"],
      },
      {
        name: "Shekila Tibs",
        amharic: "ሸክላ ጥብስ",
        description:
          "Lammfleischwürfel, trocken gebraten mit äthiopischen Gewürzen und Zwiebeln, serviert im Tontopf mit Awaze und Senf (scharfe Sauce).",
        price: "17,00",
        tags: ["scharf"],
      },
      {
        name: "Key Wot",
        amharic: "ቀይ ወጥ",
        description:
          "Rindergulasch nach äthiopischer Art mit Zwiebeln, Berbere (Chili), Kibe (äthiopische Butter) und Gewürzen. Serviert mit Ayib (hausgemachter Hüttenkäse), Shiro, Gomen, Salat sowie Rote Bete mit Kartoffeln.",
        price: "16,00",
        tags: ["scharf"],
      },
      {
        name: "Alicha Wot",
        amharic: "አልጫ ወጥ",
        description:
          "Mildes Rindergulasch mit Zwiebeln, Kibe und Gewürzen, ohne Berbere. Serviert mit Ayib, Weißkohl mit Karotten im eigenen Saft geschmort und braunen Linsen.",
        price: "16,00",
        tags: ["mild"],
      },
      {
        name: "Tibs Firfir",
        amharic: "ጥብስ ፍርፍር",
        description:
          "Klein geschnittenes Injera, gemischt mit einer scharfen Rindfleischsauce, serviert mit gekochten Eiern.",
        price: "15,00",
        tags: ["scharf"],
      },
    ],
  },
  {
    id: "vegan",
    title: "Vegetarisch & Vegan",
    note: "Unsere vegetarischen und veganen Spezialitäten sind glutenfrei und werden mit Injera serviert. Zu jedem Gericht können Sie nach Wahl Beilagen bestellen.",
    items: [
      {
        name: "Yetenbi Yetsom Beyaynetu",
        amharic: "የተንቢ የጾም በያይነቱ",
        description:
          "Die vegane Platte des Hauses mit Gemüse und Hülsenfrüchten: Atkilt Wot, Misir Wot, Kik und Grünkohl.",
        price: "15,00",
        tags: ["vegan", "glutenfrei", "Spezialität"],
      },
      {
        name: "Shiro Wot",
        amharic: "ሽሮ ወጥ",
        description:
          "Das Nationalgericht: gemahlene Erbsen in gewürzter Sauce, dazu Tomaten- und Gurkensalat.",
        price: "15,00",
        tags: ["vegan", "glutenfrei"],
      },
      {
        name: "Misir Wot",
        amharic: "ምስር ወጥ",
        description:
          "Geschälte braune Linsen in pikanter Sauce mit Kräutern und Gewürzen, dazu gemischter Salat.",
        price: "15,00",
        tags: ["vegan", "glutenfrei"],
      },
      {
        name: "Atkilt Wot",
        amharic: "አትክልት ወጥ",
        description:
          "Weißkohl mit Karotten und grünen Bohnen, im eigenen Saft geschmort mit frischen Kräutern und Gewürzen.",
        price: "15,00",
        tags: ["vegan", "glutenfrei", "mild"],
      },
    ],
  },
  {
    id: "sambusa",
    title: "Sambusa",
    note: "Knusprig gefüllte Teigtaschen, perfekt als Vorspeise oder für zwischendurch.",
    items: [
      {
        name: "Sambusa mit Linsen",
        amharic: "ሳምቡሳ የምስር",
        description: "Braune Linsen mit Kräutern und Zwiebeln.",
        price: "2,50",
        tags: ["vegan"],
      },
      {
        name: "Sambusa mit Hackfleisch",
        amharic: "ሳምቡሳ የስጋ",
        description: "Hackfleisch mit Kräutern und Zwiebeln.",
        price: "3,00",
      },
    ],
  },
  {
    id: "kaffee",
    title: "Kaffee & Jebena",
    note: "Erleben Sie unsere traditionelle äthiopische Kaffeezeremonie mit frisch geröstetem Kaffee. Ein Genuss für Körper und Seele.",
    items: [
      { name: "Eine Tasse Kaffee", price: "2,50" },
      { name: "Jebena Buna", description: "Kaffeezeremonie für 2-3 Personen", price: "6,90", tags: ["Spezialität"] },
      { name: "Jebena Buna", description: "Kaffeezeremonie für 4-5 Personen", price: "9,90", tags: ["Spezialität"] },
    ],
  },
  {
    id: "heiss",
    title: "Heißgetränke",
    items: [
      { name: "Schwarzer Tee", price: "2,00" },
      { name: "Ingwertee mit Zitrone & Honig", price: "2,50" },
      { name: "Pfefferminztee", price: "2,50" },
      { name: "Kamillentee", price: "2,50" },
      { name: "Heiße Schokolade", price: "3,00" },
      { name: "Chai Latte", price: "3,00" },
      { name: "Milchkaffee", price: "3,00" },
      { name: "Cappuccino", price: "3,00" },
      { name: "Latte Macchiato", price: "3,50" },
      { name: "Espresso", price: "2,00" },
    ],
  },
  {
    id: "kalt",
    title: "Kaltgetränke",
    items: [
      { name: "Coca-Cola", price: "2,50" },
      { name: "Coca-Cola Zero", price: "2,50" },
      { name: "Fanta", price: "2,50" },
      { name: "Sprite", price: "2,50" },
      { name: "Mineralwasser (still)", price: "2,00" },
      { name: "Mineralwasser (sprudelnd)", price: "2,00" },
      { name: "Eistee (Zitrone oder Pfirsich)", price: "2,50" },
      { name: "Orangensaft", price: "3,00" },
      { name: "Apfelsaft", price: "3,00" },
      { name: "Mangosaft", price: "3,00" },
    ],
  },
];
