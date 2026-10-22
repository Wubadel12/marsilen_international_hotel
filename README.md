# Marsilen International Hotel: Dining & Service Portal (frontend demo)

React 18 + Vite + Tailwind CSS + Lucide + React Router + qrcode.react.

```bash
npm install
npm run dev
```

## Two separate sides

| Side | URL | Who | Sign-in |
|---|---|---|---|
| Customer | `/login`, `/menu` | In-house hotel guests, and walk-in visitors at desk / table QRs | Guests: room + first name + 4-digit PIN. Visitors: name only (desk QR required) |
| Staff | `/staff/login`, `/staff/dashboard` | Kitchen, front desk | Username + password |
| Admin | `/admin` | Administrators | Username + password |

Customers never see staff links, and staff pages are not reachable without a staff sign-in.
Both sides have a **Sign out** button. Checking a guest out ends their access immediately,
even if they are still signed in on their phone.

## Two customer entry paths

The first screen (`/login`) makes the choice explicit, and the scanned QR pre-selects the right path.

| | **I'm staying at the hotel** | **I'm ordering at a table or venue** |
|---|---|---|
| Typical QR | Room QR `/menu?room=304` | Table / venue QR `/menu?desk=table-3`, `?desk=pool` |
| Sign-in | Room number, first name, room PIN | Name only (no room, no PIN) |
| Menu | Room-service menu | Menu of that restaurant or venue |
| After sign-in | Room requests: towels, housekeeping, maintenance, wake-up call | Table requests: call a waiter, bill, clear table, assistance. **No room-only services** |
| Order goes to | The guest's room | The scanned table or venue (name kept, e.g. *Restaurant · Table 3*) |
| Payment | Pay online (demo) **or** charge to the room folio | Pay online (demo) only |

A hotel guest who scans a table / venue QR can still sign in with their room PIN and choose
"bring it here" or "to my room". A room QR never offers the walk-in path.

## Demo labelling

Everything is simulated and stored in this browser. Each screen says so: a *Demo* pill in the header,
a notice on customer, staff and admin pages, "Demo order" wording at checkout and confirmations that say
"saved in this browser, not on a server". No tip is preselected, and payment and delivery choices must be made explicitly.

## QR codes

- Room QR: `/menu?room=304`. The room number is pre-filled and locked on the login page.
  A guest can only order to their own room (a mismatching QR shows a warning).
- Desk / table QR: `/menu?desk=pool` (also `lobby`, `spa`, `terrace`, and one per restaurant
  table: `table-1` ... `table-6`). On the login page there are two tabs:
  - **Hotel guest**: room + first name + PIN. After signing in they choose to have the order
    brought to the desk or to their room. It is billed to their room folio, or paid online.
  - **Visitor** (walk-in, not staying): name only. They order, **pay online**, and are served at
    that desk. No room folio. Visitor sessions expire after 4 hours.
- **Desk requests:** at a desk QR, the menu page shows *Call a waiter*, *Request the bill*,
  *Clear the table* and *Ask for assistance*. These appear on the staff dashboard (front desk /
  admin) with the desk or table as the location. Room services (towels, housekeeping, wake-up
  call, maintenance) appear for hotel guests who did not scan a desk QR.
- A QR code alone cannot place an order: the customer must sign in first (room PIN, or a visitor name at a desk QR).
- Admin → **QR codes** generates and prints all room and desk QRs. Set the public site
  address there before printing.

## Roles

- **Kitchen**: food orders only (including visitor orders). Desk requests go to front desk.
- **Front desk**: food orders, service requests (towels, housekeeping, ...), room status board, folio totals.
- **Admin**: everything above, plus the Admin area: Overview, Guests & check-in (issues PINs,
  check-out shows the folio to settle), Menu (prices, sold out), QR codes, Staff accounts.

## Demo accounts

Guests (Room / first name / PIN): `304 / Abebe / 4821` (more are listed on the login page).

Visitor flow: open `/menu?desk=table-4`, choose the **Visitor** tab, enter any name, order and pay online,
then use *Call a waiter*. Open `/staff/login` (frontdesk) in another tab to see the order and the request.

Staff: `kitchen / kitchen123`, `frontdesk / frontdesk123`, `admin / admin123`.

## Try it

Open the guest menu and the staff dashboard in two tabs of the same browser. Orders placed
as a guest appear on the dashboard live (shared through `localStorage` and the `storage` event).

## Still needs a backend

Real sign-in and sessions (PINs, passwords, roles enforced on an API), a database for stays, folios, orders, menu and
staff, payments (Stripe, Telebirr, CBE Birr), live updates across devices (today: `localStorage` + the `storage` event),
image upload for menu items, receipts and audit history, real allergen data (the seed menu has none; admins enter it),
and QR links that are validated server-side.

## Security: read this before going live

This is a front-end demo. Accounts, PINs, sessions and the guest registry are stored in the
browser, and demo credentials are shown on the login pages, so it is **not secure**. For production:
authenticate on a server (hashed passwords, server-side sessions or JWT, rate limiting), read
stays and folios from your PMS, and enforce roles on the API, not just in the UI.
The login screens include a client-side lockout (5 attempts, 30 s) that only deters casual guessing.

## Structure

```
src/
  App.jsx                      routes (customer / staff / admin)
  components/guards.jsx        RequireGuest, RequireStaff
  context/AppContext.jsx       language, theme, QR context, menu, cart, orders, rooms
  context/AuthContext.jsx      guest + staff sessions, stays (check-in/out), staff accounts
  data/accounts.js             desks, seed stays and staff, folioBalance
  data/mock.js                 bilingual menu, categories, services
  data/seed.js                 seed orders + room statuses
  i18n/dictionary.js           en / am strings
  pages/                       GuestLogin, MenuPage, StaffLogin, StaffDashboard, AdminPage
  components/admin/            Overview, Guests & rooms, Menu (+ editor), QR, Staff tabs
  components/ui.jsx            shared Field, Switch, Badge, SourceBadge, DemoNotice
  i18n/extra.js                newer en / am strings (override dictionary.js)
```
