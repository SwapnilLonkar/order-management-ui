# Order Management UI

React + Vite + TypeScript frontend for the
[order-management-api](https://github.com/SwapnilLonkar/order-management-api)
(Spring Boot) backend. Talks to the API over JWT-secured REST endpoints.

## Features

- **Three account types** — register as a **Customer** or a **Seller**
  (Admins are created out-of-band). The UI adapts to the role in your JWT:
  - *Customer*: browses all products, adds them to a **cart** and checks
    out. Orders are always placed for the customer's **own** account-linked
    customer record — there is no way to order for someone else; the
    backend enforces this even if a request names another customer.
  - *Seller*: manages only their own product catalog, sees incoming orders
    containing their products (trimmed to their own items).
  - *Admin*: sees and manages everything, including deletes, and can place
    an order on behalf of any customer from the Orders page.
- **Cart** — customers add products from the catalog, adjust quantities,
  and place the order in one checkout. The cart persists in `localStorage`.
- **Login / Register** against `/api/auth` — the JWT is stored in
  `localStorage` and attached to every request as a Bearer token.
- **Products** — list with the owning seller shown; create/edit for
  sellers and admins.
- **Customers** — recipient directory, managed by admins only (sellers and
  customers never see it; the API restricts customer writes to ADMIN).
- **Orders** — list with per-order totals and color-coded status badges,
  create an order with multiple product items, and move an order through
  its status flow (PENDING → CONFIRMED → SHIPPED → DELIVERED / CANCELLED).

Backend rules the UI respects: DELETE endpoints require an ADMIN role,
sellers can only edit their own products, and an order's status cannot
change once it is DELIVERED or CANCELLED.

## Running locally

Prerequisites: Node 20+, and the backend running (see the API repo —
`docker-compose up -d` for Postgres, then run the app on port 8080).

```bash
cp .env.example .env   # set VITE_API_BASE_URL to your backend base URL
npm install
npm run dev            # http://localhost:5173
```

The backend enables CORS for `http://localhost:5173` (and the OMS
codespace's forwarded 5173 URL) in its `SecurityConfig`.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) and build for production
- `npm run preview` — preview the production build
