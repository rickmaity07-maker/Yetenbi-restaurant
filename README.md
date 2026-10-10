# Yetenbi – Äthiopisches Restaurant & Café

Website for Yetenbi, an Ethiopian restaurant and café at Theaterstraße 6, 97070 Würzburg.
German first. Next.js 16, React 19, Tailwind CSS 4, Motion, Lenis, three.js (React Three Fiber).

Live: https://yetenbi-restaurant.vercel.app (every push to `main` deploys automatically on Vercel).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in at least DATABASE_URL and ADMIN_SESSION_SECRET
npm run db:setup             # creates the tables (safe to repeat)
npm run owner:create -- owner@example.com "long password" "Name"   # first /admin login
npm run dev                  # development, http://localhost:3000
npm run build && npm run start   # production build (use this to judge performance)
```

## Reservations

- Guests book on the page; requests are stored in Neon Postgres (project **yetenbi**, Frankfurt) as *pending*.
- The team signs in at **/login** with an owner account and lands in **/admin**, where they accept or decline each request
  (optionally with a message), enter phone bookings and set closed days.
- Emails (receipt, confirmation with calendar file, decline; plus a notification to the restaurant) are sent once
  `GMAIL_USER`, `GMAIL_APP_PASSWORD` and `RESERVATION_NOTIFY_EMAIL` are set (see `.env.example`).
- Reservations older than 180 days are deleted daily (`/api/cron/cleanup`, Vercel Cron, `CRON_SECRET`).
- Without `DATABASE_URL` the form falls back to a prepared WhatsApp message.

## Online ordering

- **/bestellen**: guests order for delivery or pickup, as soon as possible or for a later time today; payment in cash
  or by card on handover. The server re-prices every order from the menu.
- Orders are taken while the restaurant is open, until 30 minutes before closing, and not on closed days.
- The team handles orders at **/admin/bestellungen** (accept with ETA, on the way / ready, complete, reject).
  Under *Einstellungen* there: pause ordering, minimum order, delivery fee, free delivery from, delivery postcodes, times.
- Guests follow their order live at **/bestellung**; signed-in guests see their orders in the profile.

## Accounts

- Guests can create an account (email + password, or **Sign in with Google** once `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are set). The profile shows bookings and orders, lets them cancel, change details,
  export their data and delete the account. Password reset works by email.
- Booking emails contain a signed cancel link (**/stornieren**), so guests can cancel without an account.

Languages: German, English and Amharic (switch in the navigation); text lives in `src/lib/i18n.ts`, menu text in `src/lib/data.ts`.

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
| Reservierung | Request form with a live ticket; stored in the database and handled by the team in /admin. |
| Speisekarte → Online bestellen | Links to /bestellen (also in the navigation). |

Background: a fixed lattice after Ethiopian cross-stitch, with clay oil lamps (three.js flames) in a
diagonal rhythm. A small Aksum stela on the right edge lights up as you move down the page.

## Where things live

- `src/lib/data.ts` – restaurant details and the full menu (prices, three languages).
- `src/lib/hours.ts` – opening hours (used everywhere, incl. search-engine data).
- `src/lib/booking.ts` – booking rules shared by form, API and admin.
- `src/lib/ordering.ts` – ordering rules and default order settings (the owner overrides them in /admin).
- `src/lib/server/` – database, reservations, orders, emails, accounts and sessions, Google sign-in.
- `src/lib/ethiopic.ts` – Ethiopian calendar, Addis clock and Ge'ez numerals.
- `src/components/heritage/` – Aksum stela, Lalibela cross, Aksumite frame, tibeb/harag bands.
- `src/components/three/` – intro particles, 3D jebena, background clay lamps.
- `src/components/sections/` – the page sections.
- `public/img/` – photos; `ambient/` and `dish/` are small pre-blurred / pre-cropped copies.

## Still to do

- Set the Gmail variables in Vercel so booking and order emails are sent (also needed for password reset).
- Optional: set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in Vercel to show "Sign in with Google".
- Impressum and Datenschutz: fill in the owner's name, a contact email (required in the Impressum) and the VAT ID,
  if any – marked `[Name wird ergänzt]` / `[wird ergänzt]`.
- Confirm the ordering settings (minimum order, delivery fee, postcodes, times) in /admin → Bestellungen → Einstellungen.
- Photos are Unsplash stock; replace with Yetenbi's own (keep the file names in `public/img/`).
- Amharic text should be checked by a native speaker.
