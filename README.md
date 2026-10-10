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

- **/bestellen**: signed-in guests order for delivery or pickup (ordering needs an account; the basket is kept while
  they sign in or register, and all order emails go to the account's address), as soon as possible or for a later time today; payment in cash
  or by card on handover. The server re-prices every order from the menu.
- Orders are taken while the restaurant is open, until 30 minutes before closing, and not on closed days – unless the
  temporary setting *Bestellungen auch außerhalb der Öffnungszeiten* is on (then at any time, until 23:45).
- Order flow (each step is emailed to the guest, in their language):

  | Step | Who | Where |
  | --- | --- | --- |
  | Accept with ETA, or reject | owner | /admin/bestellungen |
  | *Essen fertig*, then *Verpackt* | kitchen | **/kueche** (food only, no prices or guest details) |
  | *Zur Lieferung übergeben* (choose the driver) or *Abholbereit* | owner | /admin/bestellungen |
  | *Zugestellt* | driver (own deliveries only) | **/lieferung** (address, map link, phone, amount to collect) |
  | *Abgeholt* (pickup) | owner | /admin/bestellungen |

  The team is emailed too: kitchen accounts when an order is accepted, the driver when an order is handed to them,
  and the restaurant (`RESERVATION_NOTIFY_EMAIL`) when the kitchen has packed an order and when a driver has delivered it.
  Owners can press every step themselves (e.g. on days without kitchen or driver accounts). Each button only works
  for the status it was shown for, so two people pressing at once change nothing twice.
  Under *Einstellungen* there: pause ordering, minimum order, delivery fee, free delivery from, delivery postcodes, times.
- Protection against prank and flood orders (`src/lib/server/order-guard.ts`): at most 3 orders per hour per phone
  number (however it is typed) and per device (IP address, stored only as a keyed hash for 30 days), at most 8
  unconfirmed orders at once, and first orders over 150 € only by phone. The board labels first-time and previously
  rejected guests, and *Gast sperren* blocks a guest's phone, email and device (list and unblock at the bottom).
- Guests follow their order live at **/bestellung**; signed-in guests see their orders in the profile.

## Accounts

- Guests can create an account (email + password, or **Sign in with Google** once `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are set). The profile shows bookings and orders, lets them cancel, change details,
  export their data and delete the account. Password reset works by email.
- **Fotos** (/admin/fotos): owners replace any picture on the website with their own photo. The browser uploads it
  straight to Cloudinary with a one-time signature from the server (so big phone photos work), the server checks it
  arrived in the `yetenbi/` folder and the home page refreshes. Needs `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`; without them the built-in pictures stay.
- **Team** (/admin/team): owners create logins for kitchen staff, drivers and other owners (email + starting password),
  change roles, set a new password or remove someone (they keep a plain guest account). After signing in at /login,
  everyone lands on their own screen: owners /admin, kitchen /kueche, drivers /lieferung.
- Limits against abuse (`src/lib/server/rate-limit.ts`): 10 wrong passwords per account or 30 per connection in
  15 minutes, then a 15-minute pause; 3 reset emails per address and hour; 5 sign-ups and 6 reservations per
  connection and hour. Signing in with Google takes over an account with the same email only if that account never
  proved its address (otherwise someone could pre-register a guest's email); its old password is then removed.
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
- `src/lib/ordering.ts` – ordering rules, default order settings (the owner overrides them in /admin) and who may make which step (`canMove`).
- `src/lib/server/order-flow.ts` – moves an order one step and sends the emails; used by /admin, /kueche and /lieferung.
- `src/lib/server/` – database, reservations, orders, emails, accounts and sessions, Google sign-in.
- `src/lib/ethiopic.ts` – Ethiopian calendar, Addis clock and Ge'ez numerals.
- `src/components/heritage/` – Aksum stela, Lalibela cross, Aksumite frame, tibeb/harag bands.
- `src/components/three/` – intro particles, 3D jebena, background clay lamps.
- `src/components/sections/` – the page sections.
- `public/img/` – photos; `ambient/` and `dish/` are small pre-blurred / pre-cropped copies.

## Still to do

- **Switch off "Bestellungen auch außerhalb der Öffnungszeiten"** in /admin → Bestellungen → Einstellungen once testing is
  done (turned on 2026-10-10 so orders work while the restaurant is closed).
- Create the team's logins in /admin → Team (kitchen staff and drivers), then run one test order through every step
  (accept → Küche: Essen fertig, Verpackt → hand to a driver → Lieferung: Zugestellt) and check the emails arrive.
- Google sign-in: if the OAuth consent screen in Google Cloud is still in "Testing", publish it so every guest can use it.
- Impressum and Datenschutz: fill in the owner's name, a contact email (required in the Impressum) and the VAT ID,
  if any – marked `[Name wird ergänzt]` / `[wird ergänzt]`.
- Confirm the ordering settings (minimum order, delivery fee, postcodes, times) in /admin → Bestellungen → Einstellungen.
- Photos are Unsplash stock: set the Cloudinary variables in Vercel, then upload Yetenbi's own in /admin → Fotos.
- Amharic text should be checked by a native speaker (including the new order-step emails and status labels).
