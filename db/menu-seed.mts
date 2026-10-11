// The menu as it was on the printed card: only the starting point that `npm run db:setup` copies into the
// database once (tables menu_categories / menu_items). After that the menu is edited in /admin → Speisekarte.
// Plain TypeScript without imports so Node can run it directly (type stripping).

type L = { de: string; en: string; am: string };
type Tag = "special" | "spicy" | "mild" | "vegan" | "glutenfree";
type MenuItem = {
  name: L;
  amharic?: string;
  description?: L;
  price: string;
  tags?: Tag[];
};

type MenuCategory = {
  id: string;
  title: L;
  note?: L;
  items: MenuItem[];
};

const same = (s: string): L => ({ de: s, en: s, am: s });

/*
  The menu, as on the printed card (prices unchanged). Dish names stay in their Ethiopian form;
  descriptions are given in German, English and Amharic. Amharic text should be checked by a native speaker.
*/
export const seedMenu: MenuCategory[] = [
  {
    id: "fleisch",
    title: { de: "Hauptgerichte", en: "Main dishes", am: "ዋና ምግቦች" },
    note: {
      de: "Alle Hauptspeisen werden mit Injera serviert, dem weichen, leicht säuerlichen Fladenbrot aus Teff und Grundlage jedes äthiopischen Gerichts.",
      en: "Every main dish is served with injera, the soft, slightly sour teff flatbread at the heart of every Ethiopian meal.",
      am: "ሁሉም ዋና ምግቦች ከጤፍ እንጀራ ጋር ይቀርባሉ።",
    },
    items: [
      {
        name: same("Yetenbi Kitfo"),
        amharic: "የተንቢ ክትፎ",
        description: {
          de: "Nach Gurage-Art: gehacktes Rindfleisch mit gewürzter, spezieller Butter.",
          en: "Gurage style: minced beef with spiced clarified butter.",
          am: "የጉራጌ ክትፎ፣ በቅመም ቅቤ የተዘጋጀ የተፈጨ የበሬ ሥጋ።",
        },
        price: "18,00",
        tags: ["special"],
      },
      {
        name: same("Shekila Tibs"),
        amharic: "ሸክላ ጥብስ",
        description: {
          de: "Lammfleischwürfel, trocken gebraten mit äthiopischen Gewürzen und Zwiebeln, serviert im Tontopf mit Awaze und Senf (scharfe Sauce).",
          en: "Diced lamb, dry-fried with Ethiopian spices and onions, served in a clay pot with awaze and mustard (hot sauce).",
          am: "በሽንኩርትና በቅመም የተጠበሰ የበግ ሥጋ፣ በሸክላ ድስት ከአዋዜና ሰናፍጭ ጋር።",
        },
        price: "17,00",
        tags: ["spicy"],
      },
      {
        name: same("Key Wot"),
        amharic: "ቀይ ወጥ",
        description: {
          de: "Rindergulasch nach äthiopischer Art mit Zwiebeln, Berbere (Chili), Kibe (äthiopische Butter) und Gewürzen. Serviert mit Ayib (hausgemachter Hüttenkäse), Shiro, Gomen, Salat sowie Rote Bete mit Kartoffeln.",
          en: "Ethiopian beef stew with onions, berbere (chilli), kibe (spiced butter) and spices. Served with ayib (house-made fresh cheese), shiro, gomen, salad and beetroot with potatoes.",
          am: "በበርበሬ፣ በቅቤና በቅመም የተሠራ የበሬ ወጥ፤ ከአይብ፣ ሽሮ፣ ጎመን፣ ሰላጣና ቀይ ሥር ከድንች ጋር።",
        },
        price: "16,00",
        tags: ["spicy"],
      },
      {
        name: same("Alicha Wot"),
        amharic: "አልጫ ወጥ",
        description: {
          de: "Mildes Rindergulasch mit Zwiebeln, Kibe und Gewürzen, ohne Berbere. Serviert mit Ayib, Weißkohl mit Karotten im eigenen Saft geschmort und braunen Linsen.",
          en: "Mild beef stew with onions, kibe and spices, without berbere. Served with ayib, braised white cabbage with carrots and brown lentils.",
          am: "ያለ በርበሬ የተሠራ ለስላሳ የበሬ ወጥ፤ ከአይብ፣ ከጎመንና ካሮት እንዲሁም ከምስር ጋር።",
        },
        price: "16,00",
        tags: ["mild"],
      },
      {
        name: same("Tibs Firfir"),
        amharic: "ጥብስ ፍርፍር",
        description: {
          de: "Klein geschnittenes Injera, gemischt mit einer scharfen Rindfleischsauce, serviert mit gekochten Eiern.",
          en: "Torn injera tossed in a spicy beef sauce, served with boiled eggs.",
          am: "በቅመም የበሬ ሥጋ መረቅ የተለወሰ እንጀራ፣ ከተቀቀለ እንቁላል ጋር።",
        },
        price: "15,00",
        tags: ["spicy"],
      },
    ],
  },
  {
    id: "vegan",
    title: { de: "Vegetarisch & Vegan", en: "Vegetarian & vegan", am: "የጾም ምግቦች" },
    note: {
      de: "Unsere vegetarischen und veganen Spezialitäten sind glutenfrei und werden mit Injera serviert. Zu jedem Gericht können Sie nach Wahl Beilagen bestellen.",
      en: "Our vegetarian and vegan specialities are gluten-free and served with injera. Extra sides can be added to any dish.",
      am: "የጾም ምግቦቻችን ከግሉተን ነፃ ሲሆኑ ከእንጀራ ጋር ይቀርባሉ።",
    },
    items: [
      {
        name: same("Yetenbi Yetsom Beyaynetu"),
        amharic: "የተንቢ የጾም በያይነቱ",
        description: {
          de: "Die vegane Platte des Hauses mit Gemüse und Hülsenfrüchten: Atkilt Wot, Misir Wot, Kik und Grünkohl.",
          en: "The house vegan platter of vegetables and pulses: atkilt wot, misir wot, kik and collard greens.",
          am: "የቤቱ የጾም በያይነቱ፦ አትክልት፣ ምስር ወጥ፣ ክክና ጎመን።",
        },
        price: "15,00",
        tags: ["vegan", "glutenfree", "special"],
      },
      {
        name: same("Shiro Wot"),
        amharic: "ሽሮ ወጥ",
        description: {
          de: "Das Nationalgericht: gemahlene Erbsen in gewürzter Sauce, dazu Tomaten- und Gurkensalat.",
          en: "The national dish: ground chickpea and pea stew, with tomato and cucumber salad.",
          am: "የተፈጨ የአተር ሽሮ ወጥ፣ ከቲማቲምና ዱባ ሰላጣ ጋር።",
        },
        price: "15,00",
        tags: ["vegan", "glutenfree"],
      },
      {
        name: same("Misir Wot"),
        amharic: "ምስር ወጥ",
        description: {
          de: "Geschälte braune Linsen in pikanter Sauce mit Kräutern und Gewürzen, dazu gemischter Salat.",
          en: "Split red lentils in a piquant sauce with herbs and spices, with mixed salad.",
          am: "በቅመም የተሠራ የምስር ወጥ፣ ከሰላጣ ጋር።",
        },
        price: "15,00",
        tags: ["vegan", "glutenfree"],
      },
      {
        name: same("Atkilt Wot"),
        amharic: "አትክልት ወጥ",
        description: {
          de: "Weißkohl mit Karotten und grünen Bohnen, im eigenen Saft geschmort mit frischen Kräutern und Gewürzen.",
          en: "White cabbage, carrots and green beans, gently braised with fresh herbs and spices.",
          am: "ጥቅል ጎመን፣ ካሮትና ፎሶሊያ በቅመም የተሠራ።",
        },
        price: "15,00",
        tags: ["vegan", "glutenfree", "mild"],
      },
    ],
  },
  {
    id: "sambusa",
    title: same("Sambusa"),
    note: {
      de: "Knusprig gefüllte Teigtaschen, perfekt als Vorspeise oder für zwischendurch.",
      en: "Crisp filled pastries, perfect as a starter or a snack.",
      am: "ጥርት ያለ የተሞላ ሳምቡሳ፣ ለመጀመሪያ ወይም ለመክሰስ።",
    },
    items: [
      {
        name: { de: "Sambusa mit Linsen", en: "Lentil sambusa", am: "የምስር ሳምቡሳ" },
        amharic: "ሳምቡሳ የምስር",
        description: {
          de: "Braune Linsen mit Kräutern und Zwiebeln.",
          en: "Brown lentils with herbs and onions.",
          am: "ምስር በሽንኩርትና በቅመም።",
        },
        price: "2,50",
        tags: ["vegan"],
      },
      {
        name: { de: "Sambusa mit Hackfleisch", en: "Minced beef sambusa", am: "የሥጋ ሳምቡሳ" },
        amharic: "ሳምቡሳ የስጋ",
        description: {
          de: "Hackfleisch mit Kräutern und Zwiebeln.",
          en: "Minced beef with herbs and onions.",
          am: "የተፈጨ ሥጋ በሽንኩርትና በቅመም።",
        },
        price: "3,00",
      },
    ],
  },
  {
    id: "kaffee",
    title: { de: "Kaffee & Jebena", en: "Coffee & jebena", am: "ቡናና ጀበና" },
    note: {
      de: "Erleben Sie unsere traditionelle äthiopische Kaffeezeremonie mit frisch geröstetem Kaffee. Ein Genuss für Körper und Seele.",
      en: "Join our traditional Ethiopian coffee ceremony with freshly roasted beans. A treat for body and soul.",
      am: "በአዲስ በተቆላ ቡና የሚደረገውን ባህላዊ የቡና ሥነ ሥርዓታችንን ይቀላቀሉ።",
    },
    items: [
      { name: { de: "Eine Tasse Kaffee", en: "A cup of coffee", am: "አንድ ስኒ ቡና" }, price: "2,50" },
      {
        name: same("Jebena Buna"),
        description: {
          de: "Kaffeezeremonie für 2-3 Personen",
          en: "Coffee ceremony for 2-3 people",
          am: "የቡና ሥነ ሥርዓት ለ2-3 ሰዎች",
        },
        price: "6,90",
        tags: ["special"],
      },
      {
        name: same("Jebena Buna"),
        description: {
          de: "Kaffeezeremonie für 4-5 Personen",
          en: "Coffee ceremony for 4-5 people",
          am: "የቡና ሥነ ሥርዓት ለ4-5 ሰዎች",
        },
        price: "9,90",
        tags: ["special"],
      },
    ],
  },
  {
    id: "heiss",
    title: { de: "Heißgetränke", en: "Hot drinks", am: "ትኩስ መጠጦች" },
    items: [
      { name: { de: "Schwarzer Tee", en: "Black tea", am: "ሻይ" }, price: "2,00" },
      {
        name: { de: "Ingwertee mit Zitrone & Honig", en: "Ginger tea with lemon & honey", am: "የዝንጅብል ሻይ ከሎሚና ማር ጋር" },
        price: "2,50",
      },
      { name: { de: "Pfefferminztee", en: "Peppermint tea", am: "የናና ሻይ" }, price: "2,50" },
      { name: { de: "Kamillentee", en: "Chamomile tea", am: "የካሞሚል ሻይ" }, price: "2,50" },
      { name: { de: "Heiße Schokolade", en: "Hot chocolate", am: "ትኩስ ቸኮሌት" }, price: "3,00" },
      { name: same("Chai Latte"), price: "3,00" },
      { name: { de: "Milchkaffee", en: "Café au lait", am: "ቡና በወተት" }, price: "3,00" },
      { name: same("Cappuccino"), price: "3,00" },
      { name: same("Latte Macchiato"), price: "3,50" },
      { name: same("Espresso"), price: "2,00" },
    ],
  },
  {
    id: "kalt",
    title: { de: "Kaltgetränke", en: "Cold drinks", am: "ቀዝቃዛ መጠጦች" },
    items: [
      { name: same("Coca-Cola"), price: "2,50" },
      { name: same("Coca-Cola Zero"), price: "2,50" },
      { name: same("Fanta"), price: "2,50" },
      { name: same("Sprite"), price: "2,50" },
      { name: { de: "Mineralwasser (still)", en: "Still water", am: "ውሃ" }, price: "2,00" },
      { name: { de: "Mineralwasser (sprudelnd)", en: "Sparkling water", am: "አምቦ ውሃ" }, price: "2,00" },
      {
        name: { de: "Eistee (Zitrone oder Pfirsich)", en: "Iced tea (lemon or peach)", am: "ቀዝቃዛ ሻይ (ሎሚ ወይም ኮክ)" },
        price: "2,50",
      },
      { name: { de: "Orangensaft", en: "Orange juice", am: "የብርቱካን ጭማቂ" }, price: "3,00" },
      { name: { de: "Apfelsaft", en: "Apple juice", am: "የፖም ጭማቂ" }, price: "3,00" },
      { name: { de: "Mangosaft", en: "Mango juice", am: "የማንጎ ጭማቂ" }, price: "3,00" },
    ],
  },
];
