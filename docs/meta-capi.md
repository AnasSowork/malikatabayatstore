# Meta Pixel + Conversions API (CAPI)

This store sends ecommerce events to Meta using **browser Pixel** and **server-side Conversions API** with shared `event_id` values for deduplication.

## Events

| Event | Browser (Pixel) | Server (CAPI) | When |
| --- | --- | --- | --- |
| ViewContent | Yes | Yes | Product page load (once per visit) |
| AddToCart | Yes | Yes | Default bundle on load + each new bundle tier selected |
| InitiateCheckout | Yes | Yes | Customer submits the order form |
| Purchase | Yes (thank-you page) | Yes (order API) | After successful order creation |

## Deduplication

Meta deduplicates events that share the same **event name** + **event_id** across Pixel and CAPI.

- **ViewContent / AddToCart / InitiateCheckout:** Client generates `event_id`, sends Pixel via `fbq('track', …, { eventID })` and POSTs the same id to `/api/meta/events` for CAPI.
- **Purchase:** `event_id` = order UUID (`order.id`). CAPI fires in `POST /api/orders` (authoritative, full customer data). Pixel fires once on `/thank-you` via `ThankYouPurchaseTracker`.

Purchase is intentionally **not** sent twice from the server (no duplicate CAPI from thank-you).

## Advanced matching (CAPI)

Hashed with SHA-256 per Meta requirements (`src/lib/meta-capi-hash.ts`):

- Email (when collected)
- Phone (Moroccan `0XXXXXXXXX` → `212XXXXXXXXX` before hash)
- First name (from full name)
- City
- External ID (order id on Purchase)

Plaintext on CAPI payload (not hashed):

- `client_ip_address`
- `client_user_agent`
- `fbp` / `fbc` cookies (from browser, forwarded on checkout)

## Commerce parameters

All events include (`src/lib/meta-commerce.ts`):

- `value`, `currency: "MAD"`
- `content_ids`, `content_type: "product"`
- `contents`, `num_items`

Purchase CAPI also sets `event_time` from the order `createdAt` timestamp.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | Yes | Already used by `MetaPixel.tsx` |
| `META_CAPI_ACCESS_TOKEN` | Yes (prod) | System User token from Meta Events Manager → Settings → Conversions API |
| `META_CAPI_TEST_EVENT_CODE` | Testing only | From Test Events tab; remove in production |

Optional alias: `META_PIXEL_ID` (server-only override; defaults to `NEXT_PUBLIC_META_PIXEL_ID`).

**Hostinger:** add `META_CAPI_ACCESS_TOKEN` in the Node.js app environment (never commit tokens).

## Testing in Meta Events Manager

1. Copy **Test event code** from Events Manager → **Test events**.
2. Set `META_CAPI_TEST_EVENT_CODE` on the server and redeploy.
3. Browse a product, change bundle quantity, submit an order, land on thank-you.
4. Confirm each event appears as **Browser** + **Server** with matching parameters.
5. Remove `META_CAPI_TEST_EVENT_CODE` for live traffic.

## Key files

- `src/lib/meta-pixel-events.ts` — client Pixel + CAPI relay for ViewContent, AddToCart, InitiateCheckout; Pixel-only Purchase on thank-you
- `src/app/api/meta/events/route.ts` — server CAPI for browser-originated events
- `src/app/api/orders/route.ts` — server CAPI Purchase after customer orders (skipped for admin-created orders)
- `src/lib/meta-capi-server.ts` — Graph API v21.0 POST to `/events`
- `src/lib/meta-capi-hash.ts` — PII hashing
- `src/lib/meta-commerce.ts` — shared commerce payload
- `src/lib/meta-event-id.ts` — `event_id` generation

## Diagnostics checklist

- **Missing currency / value:** enforced in `buildMetaCommerceData` (`MAD` + numeric value).
- **Missing event_id:** rejected by API route and CAPI sender.
- **Poor Event Match Quality:** ensure phone/name/city are filled on checkout; verify `_fbp` cookie exists after Pixel loads.
- **Double Purchase counts:** Purchase Pixel only on thank-you; InitiateCheckout is separate from Purchase (not counted as a lead conversion).

## Maintenance

- Rotate `META_CAPI_ACCESS_TOKEN` in Meta Business Settings if compromised.
- After Pixel ID changes, update `NEXT_PUBLIC_META_PIXEL_ID` and ensure the CAPI token has access to the same dataset.
- Internal analytics (`SiteAnalyticsBeacon`) remain independent — never send order/product data through analytics beacons.
