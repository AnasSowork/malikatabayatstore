# Sendit integration

Source of truth: OpenAPI `https://app.sendit.ma/docs/api-docs.json` (Swagger UI: `/api/documentation`).

Base URL: `https://app.sendit.ma/api/v1/`

## Authentication

1. Merchant generates **public_key** + **secret_key** in Sendit (Settings → API integrations).
2. `POST /login` with `{ "public_key", "secret_key" }`.
3. Response `data.token` → `Authorization: Bearer <token>` on subsequent calls.
4. Rate limit (docs): 1000 requests/hour.

Env (server-only):

| Variable | Purpose |
| --- | --- |
| `SENDIT_PUBLIC_KEY` | Login public key |
| `SENDIT_SECRET_KEY` | Login secret key |
| `SENDIT_API_BASE_URL` | Default production API root |
| `SENDIT_PICKUP_DISTRICT_ID` | Pickup city id (default **46** Casablanca) |
| `SHIPPING_PROVIDER=sendit` | Select Sendit adapter |

Test/sandbox: public plugin docs mention test API keys; use a **dedicated test key** from the Sendit dashboard for staging. Do not point production keys at automated tests.

## Capability map (from OpenAPI)

| Capability | Endpoint | Method | Notes |
| --- | --- | --- | --- |
| Auth | `/login` | POST | `public_key`, `secret_key` → JWT |
| List parcels | `/deliveries` | GET | page, querystring |
| Create parcel | `/deliveries` | POST | `NewColisData` |
| Get parcel | `/deliveries/{code}` | GET | status, labelUrl, … |
| Update parcel | `/deliveries/{code}` | PUT | |
| Delete parcel | `/deliveries/{code}` | DELETE | used as cancel |
| Labels | `/deliveries/getlabels` | POST | `codesToPrint`, `printFormat` |
| Status catalog | `/all-status-deliveries` | GET | |
| Cities/districts | `/districts` | GET | **id required** for create; querystring search |
| Pickup cities | `/districts/pickup-cities` | GET | |
| District detail | `/districts/{id}` | GET | |
| Pickups | `/pickups` | CRUD | |
| Stock / products / returns / invoices | various | — | not used for COD create path |
| Webhooks | *(PDF only)* | POST to merchant URL | Signature details **not** in OpenAPI JSON |

## Order → Sendit create mapping

| Order / app | Sendit field |
| --- | --- |
| `customerName` | `name` |
| `phone` | `phone` |
| `streetAddress` | `address` |
| resolved city → district | `district_id` (integer) |
| `SENDIT_PICKUP_DISTRICT_ID` | `pickup_district_id` |
| `totalPrice` | `amount` (COD, MAD) |
| `id` | `reference` (merchant reconciliation) |
| `shippingNoOpen` | `allow_open` = 0 if no-open else 1 |
| product + qty / description | `products` (free text; `products_from_stock=0`) |
| comment + description | `comment` |
| — | `allow_try=0`, `option_exchange=0` |

Tracking stored: `shippingProvider=sendit`, `shippingTrackingId=<code>` (e.g. `DXXXXXXX`).

## City mapping

`Order.city` (free text) → `GET /districts?querystring=…` → **exact** match on normalized `ville` / `name` / `arabic_name`.

- 0 matches → `SENDIT_CITY_NOT_MAPPED` (no API create)
- >1 distinct ids → `SENDIT_CITY_AMBIGUOUS`
- No silent fuzzy match

## Status normalization

Documented Sendit `status` → `ShippingStatus`:

| Sendit | Normalized |
| --- | --- |
| PENDING, TO_PREPARE, NEW_DESTINATION | CREATED |
| TO_PICKUP, PICKEDUP, WAREHOUSE, TRANSIT, DISTRIBUTED, DELIVERING, SCHEDULED | IN_TRANSIT |
| UNREACHABLE, POSTPONED | FAILED_DELIVERY (non-terminal — **no** auto CANCELLED) |
| DELIVERED | DELIVERED |
| CANCELED | CANCELLED |
| REJECTED (+ return pipeline) | RETURNED |

`ShippingStatus` → suggested `OrderStatus` via `suggestedOrderStatusFromShipping`. Applied through `syncShipmentStatus` / webhook sync / admin PATCH + lifecycle — never from the adapter.

## Duplicate protection

Before create: refuse if `shippingTrackingId` set → `SHIPMENT_ALREADY_EXISTS`.  
`reference=Order.id` sent to Sendit for reconciliation (API does not document idempotency keys).

## Webhooks (Step 5)

### Documentation findings (2026-08-20)

OpenAPI intro: Sendit POSTs to a merchant-configured URL; **payload schema, signature algorithm, headers, retries** are deferred to an external “Documentation des Webhooks (PDF)”.

That PDF is **not publicly reachable** (Swagger UI, common `/docs/*.pdf` paths, plugins site — all failed). Signature contract therefore remains **unverified**.

### Security policy used

**Do not trust webhook body status.**

```text
POST /api/webhooks/sendit
  → optional SENDIT_WEBHOOK_SECRET gate
  → extract code / reference only
  → GET /deliveries/{code} with Sendit Bearer JWT (authoritative)
  → normalizeSenditStatus
  → transition guard
  → Order update + scheduleOrderStatusTransition
  → Meta DeliveredOrder only via lifecycle (consent-aware)
```

If webhook claims `DELIVERED` but API says `TRANSIT`, API wins.

### Endpoint

`POST https://<your-domain>/api/webhooks/sendit`

Configure this URL in the Sendit merchant dashboard (manual registration).

Abuse limits (Step 6): body ≤ 16KB; per-IP 60 req/min; global 300/min; code/ref charset + length limits.

Optional secret (recommended until PDF HMAC is implemented):

| Method | How |
| --- | --- |
| Query | `...?secret=<SENDIT_WEBHOOK_SECRET>` — **anti-abuse only**, not HMAC auth |
| Header | `X-Sendit-Webhook-Secret` or `X-Webhook-Secret` (preferred if Sendit supports it) |
| Bearer | `Authorization: Bearer <SENDIT_WEBHOOK_SECRET>` |

Use a high-entropy secret (≥24 chars). Never log the full callback URL.

### Expected HTTP responses

| Case | Status | Body |
| --- | --- | --- |
| Processed / ignored unknown order | 200 | `{ ok: true, applied, reason }` |
| Bad JSON / missing ids | 400 | `{ ok: false, code }` |
| Secret mismatch | 401 | `{ ok: false, code }` |
| Sendit API down | 503 | `{ ok: false, code }` (retryable) |

Retry intervals / exact success codes from Sendit PDF: **unknown** — we use 200 for ack and 503 when API fetch fails.

### Automatic transitions allowed

| From | To | When |
| --- | --- | --- |
| SHIPPED | DELIVERED | API status DELIVERED |
| SHIPPED | RETURNED | REJECTED / return terminal |
| SHIPPED | CANCELLED | CANCELED |
| CONFIRMED | SHIPPED | Recovery if tracking exists |
| DELIVERED | RETURNED | Return after delivery |

Rejected: DELIVERED→SHIPPED, UNREACHABLE→CANCELLED, POSTPONED→CANCELLED, etc.

### PAID / settlement

No `PAID` value in OpenAPI `Colis.status`. Do **not** map settlement to DELIVERED. No Meta settlement event.

### Manual sync

`POST /api/admin/shipping/{orderId}/sync` (admin auth) — same authority path. Admin modal: **Synchroniser le statut**.

### Replay / idempotency

No documented event ID → rely on transition no-ops + MetaEventLog uniqueness for DeliveredOrder.

## Files

- `src/lib/shipping/providers/sendit-client.ts`
- `src/lib/shipping/providers/sendit-cities.ts`
- `src/lib/shipping/providers/sendit.ts`
- `src/lib/shipping/providers/sendit-webhook.ts`
- `src/lib/shipping/sync.ts`
- `src/lib/shipping/transition-guard.ts`
- `src/app/api/webhooks/sendit/route.ts`
- `src/app/api/admin/shipping/[orderId]/sync/route.ts`
