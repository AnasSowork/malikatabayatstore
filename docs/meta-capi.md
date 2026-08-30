# Meta Pixel + Conversions API (CAPI)

This store sends ecommerce events to Meta using **browser Pixel** and **server-side Conversions API** with shared `event_id` values for deduplication.

## Event semantics (Phase 2 + Step 3)

| Event | Business meaning |
| --- | --- |
| PageView | Storefront page view |
| ViewContent | Product detail viewed |
| AddToCart | Customer **deliberately selects a bundle quantity offer** (not PDP mount) |
| InitiateCheckout | Customer submits the COD order form |
| **Purchase** | **`COD Order Submitted`** — successful `POST /api/orders` creating a `PENDING` order. **Not** payment received. **Not** delivered sale. |
| **QualifiedOrder** | First admin transition to **CONFIRMED** (server CAPI custom only) |
| **DeliveredOrder** | First transition to **DELIVERED** (server CAPI custom only) |

See [`meta-event-map.md`](./meta-event-map.md) and [`meta-order-lifecycle.md`](./meta-order-lifecycle.md).

## Browser / server responsibilities

| Event | Browser Pixel | Server CAPI |
| --- | --- | --- |
| ViewContent / AddToCart / InitiateCheckout | Yes | Yes via `POST /api/meta/events` |
| Purchase | Thank-you page only | **Authoritative** from `POST /api/orders` |

Purchase is **not** accepted on the generic Meta relay. Thank-you does **not** send a second authoritative CAPI Purchase.

## event_id strategy

- Funnel events: client UUID prefixed (`vc_`, `atc_`, `ic_`)
- Purchase: **deterministic** `purchaseEventId(orderId)` = order UUID (same on server + browser for Meta dedupe)
- QualifiedOrder: `qualified-order:{orderId}`
- DeliveredOrder: `delivered-order:{orderId}`
- Retries reuse the same `event_id`

## Attribution storage

On order create, validated values are persisted on `Order`:

- `metaFbp`, `metaFbc` (validated verbatim cookies)
- `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm` (first-touch session)
- `marketingConsent` (boolean snapshot from the client)

First-touch UTMs are captured in `sessionStorage` by `AttributionCapture` without rewriting URLs.

## Match quality (Parameter Builder)

Server-side checkout uses Meta’s official [`capi-param-builder-nodejs`](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameter-builder-library) to:

- Build **`fbc` from first-touch `fbclid`** (stored in session before consent/Pixel)
- Prefer **IPv6 client IP** when available
- Send **`event_source_url`** and **`referrer_url`**
- Normalize + SHA256-hash **phone, name, city, country, external_id** per Meta rules

First-touch capture (`src/lib/meta-first-touch.ts`) runs on every page load — no marketing consent required for storing `fbclid`.

Browser Pixel + funnel CAPI still require marketing consent. **Server CAPI Purchase always sends** (first-party order).

In Events Manager → Pixel **Settings**: enable **Automatic Advanced Matching** and check phone/city/name parameters.

## Consent behavior

Categories: `necessary` | `analytics` | `marketing`.

Meta belongs under **marketing**.

- Before marketing consent: Pixel is not initialized; browser funnel events are not sent.
- **Server CAPI Purchase always sends** on successful checkout (first-party order data). Browser Pixel Purchase on thank-you still requires marketing consent.
- **QualifiedOrder / DeliveredOrder** CAPI respects `marketingConsent === false` (skipped with log).
- Consent stored in `localStorage` key `malikat_consent_v1`.
- Order requests include `meta.marketingConsent` (`true` / `false` / omitted when banner not answered).

## Generic endpoint security (`POST /api/meta/events`)

- Allowlist: `ViewContent`, `AddToCart`, `InitiateCheckout` only
- **Purchase rejected**
- Schema limits (value/qty/productId)
- Product must exist in DB
- Invalid fbp/fbc dropped
- Origin/referer soft check
- In-memory per-IP rate limit
- Respects `marketingConsent: false`

## Failure behavior

Order create is business-critical. Meta CAPI runs **after** the order is saved and **never** fails the HTTP 201 response. Failures are logged without raw PII and recorded in `MetaEventLog` when possible.

## MetaEventLog

Table `meta_event_logs` with unique `(orderId, eventName)` for idempotent server delivery tracking (Purchase, QualifiedOrder, DeliveredOrder; Cancelled/Returned as internal SKIPPED). No raw customer PII.

Admin retry: `POST /api/admin/meta-events/retry` `{ "orderId": "...", "eventName": "QualifiedOrder" }` (optional eventName; defaults to all FAILED for that order).

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | Yes (for Pixel) | Public |
| `META_PIXEL_ID` | Optional | Server override |
| `META_CAPI_ACCESS_TOKEN` | Yes (for CAPI) | Secret — hPanel only |
| `META_CAPI_TEST_EVENT_CODE` | Testing only | Remove for live ads |

Missing Meta config → analytics skipped; **checkout still works**.

## Key files

- `src/components/MetaPixel.tsx`, `ConsentBanner.tsx`, `AttributionCapture.tsx`
- `src/lib/meta-pixel-events.ts`, `meta-capi-server.ts`, `meta-event-log.ts`, `meta-utm.ts`, `consent.ts`
- `src/app/api/orders/route.ts`, `src/app/api/meta/events/route.ts`
