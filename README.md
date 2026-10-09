# Yetenbi – Äthiopisches Restaurant & Café

Website for Yetenbi, an Ethiopian restaurant and café at Theaterstraße 6, 97070 Würzburg.
German first. Next.js 16, React 19, Tailwind CSS 4, Motion, Lenis, three.js (React Three Fiber).

## Run locally

```bash
npm install
npm run dev          # development, http://localhost:3000
npm run build && npm run start   # production build (use this to judge performance)
```

## What's on the page

| Section | What it is |
| --- | --- |
| Intro | Automatic three.js particle story: coffee galaxy → bean → jebena → YETENBI → burst (skippable). |
| Hero | Photo with a field of Aksum stelae drawn in line art, windows lit one storey at a time. |
| Willkommen | One sentence that lights up word by word, with photos set into the type. |
| Die Platte | Pinned section: an injera platter on a woven mesob rim turns as you scroll and presents each dish. |
| Speisekarte | The full menu as an illuminated-manuscript card (harag head, tibeb hem, Aksumite frame). |
| Drei Runden | Coffee ceremony in its three rounds (Abol, Tona, Baraka); a sini cup fills once per round. |
| Sprichwort / Gut zu wissen / Amharisch | Proverb band, practical facts, a few Amharic phrases with a live fidel chart. |
| Anfahrt | Address, map, and today's date and hour in Addis Ababa (Ethiopian calendar and clock). |
| Reservierung | Request form with a live ticket; sends the request via WhatsApp to the restaurant. |

Background: a fixed lattice after Ethiopian cross-stitch, with clay oil lamps (three.js flames) in a
diagonal rhythm. A small Aksum stela on the right edge lights up as you move down the page.

## Where things live

- `src/lib/data.ts` – restaurant details, opening hours, the full menu with prices.
- `src/lib/reservation.ts` – reservation validation, time slots and the WhatsApp message.
- `src/lib/ethiopic.ts` – Ethiopian calendar, Addis clock and Ge'ez numerals.
- `src/components/heritage/` – Aksum stela, Lalibela cross, Aksumite frame, tibeb/harag bands.
- `src/components/three/` – intro particles, 3D jebena, background clay lamps.
- `src/components/sections/` – the page sections.
- `public/img/` – photos; `ambient/` and `dish/` are small pre-blurred / pre-cropped copies.

## Before going live

- Opening hours are a placeholder (only "opens 11:00" was confirmed) – `src/lib/data.ts`, `src/lib/reservation.ts`.
- Photos are Unsplash stock; replace with Yetenbi's own (keep the file names in `public/img/`).
- Impressum and Datenschutz need the owner's legal details.
- Amharic text should be checked by a native speaker.
- Reservations go through WhatsApp; a booking backend (database, emails) can replace `reservationLink()`.
