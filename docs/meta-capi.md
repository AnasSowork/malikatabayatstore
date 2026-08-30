# Meta Pixel + Conversions API (CAPI)

This store implements Meta’s official **Parameter Builder** pattern (client + server) for Pixel and Conversions API, with shared `event_id` values for deduplication.

**Meta references**

- [Parameter Builder Library](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameter-builder-library)
- [Client-side onboarding](https://developers.facebook.com/docs/marketing-api/conversions-api/parameter-builder-feature-library/client-side-onboarding)
- [Payload Helper](https://developers.facebook.com/docs/marketing-api/conversions-api/payload-helper)
- [Managing fbc and fbp](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc)

## Event semantics

| Event | Business meaning |
| --- | --- |
| PageView | Storefront page view |
| ViewContent | Product detail viewed |
| AddToCart | Customer selects a bundle quantity offer |
| InitiateCheckout | Customer submits the COD order form |
| **Purchase** | **COD order submitted** — `POST /api/orders` creates `PENDING`. Not payment received. |
| **QualifiedOrder** | First admin transition → `CONFIRMED` (CAPI custom, server only) |
| **DeliveredOrder** | First transition → `DELIVERED` (CAPI custom, server only) |

See [`meta-event-map.md`](./meta-event-map.md) and [`meta-order-lifecycle.md`](./meta-order-lifecycle.md).

## Browser / server responsibilities

| Event | Browser Pixel | Server CAPI |
| --- | --- | --- |
| ViewContent / AddToCart / InitiateCheckout | Yes (marketing consent) | Yes via `POST /api/meta/events` |
| Purchase | Thank-you page only (marketing consent) | **Always** from `POST /api/orders` |

Purchase is **not** accepted on the generic Meta relay. Thank-you does **not** send a second authoritative CAPI Purchase.

## Parameter Builder (Meta-compliant)

Meta requires **both** client-side and server-side Parameter Builder for best Event Match Quality (EMQ).

### Client-side (`meta-capi-param-builder-clientjs`)

Runs on **every storefront page load** in `AttributionCapture` — **before** marketing consent (first-party attribution cookies only).

| Parameter | Cookie / storage | Behavior |
| --- | --- | --- |
| `fbc` | `_fbc` | Built from URL `fbclid` by Meta SDK; **never modified** after set |
| `fbp` | `_fbp` | Created by Meta SDK if missing |
| `client_ip_address` | `_fbi` | Set via `getIpFn` → `GET /api/meta/client-ip` (IPv6 preferred) |
| `fbclid` (backup) | `sessionStorage` | Raw URL value stored verbatim in `meta-first-touch.ts` |

**Meta rules we follow**

- Capture `_fbp` / `_fbc` **as early as possible** on landing (not only at checkout).
- **Do not** trim, lowercase, decode, or truncate `fbclid` or `_fbc`.
- **Do not** manually rebuild `fbc` — the SDK formats `fb.1.{timestamp}.{fbclid}`.
- In-app browser click IDs handled by SDK `processAndCollectAllParams`.

**File:** `src/lib/meta-param-builder-client.ts`

### Server-side (`capi-param-builder-nodejs`)

Runs on checkout and funnel CAPI relay.

| Parameter | Source |
| --- | --- |
| `fbc` | `_fbc` cookie verbatim → else build from unmodified `fbclid` |
| `fbp` | `_fbp` cookie verbatim |
| `client_ip_address` | `_fbi` cookie → `x-forwarded-for` (IPv6 preferred) → `x-real-ip` |
| `event_source_url` | Checkout / landing URL |
| `referrer_url` | Referer header |
| `ph`, `fn`, `ln`, `ct`, `country`, `external_id` | Normalized + SHA256 via SDK (hash **once**, server-side) |

**File:** `src/lib/meta-param-builder-server.ts`

### Customer information (hashed PII)

Checkout collects **phone, name, city** (no email on COD form). Sent hashed on every Purchase:

| CAPI field | Checkout source |
| --- | --- |
| `ph` | Phone |
| `fn` / `ln` | Customer name |
| `ct` | City |
| `country` | `ma` (Morocco) |
| `external_id` | Order UUID |

Hashed values from Parameter Builder are **case-sensitive** — send as-is to Graph API (no re-normalizing).

## Events Manager setup (manual)

In **Events Manager → your Pixel → Settings**:

1. Turn **Automatic Advanced Matching** **ON**.
2. Under **Show Customer Information Parameters**, enable:
   - Phone
   - First name / Last name
   - City
3. (Email — only if added to checkout later)

## Validate with Payload Helper

After deploy:

1. Open [Payload Helper](https://developers.facebook.com/docs/marketing-api/conversions-api/payload-helper) or Events Manager → **Test events**.
2. Set **Event name:** `Purchase`, **Action source:** `website`.
3. Paste from a test order (admin order modal → `metaFbc`):
   - **`fbc`** — must match `fb.1.{timestamp}.{fbclid}` with **original case**
   - **`fbp`** — from `_fbp` cookie
   - **`ph`, `fn`, `ln`, `ct`** — pre-hashed values (do not re-hash)
4. Confirm no “modified click ID” or format warnings.

### Test ad click locally

1. New incognito window.
2. Open: `https://malikatalabayat.com/?fbclid=IwAR_testClickId1234567890`
3. Complete order in **same tab**.
4. Check **Application → Session Storage** for `meta_first_touch_fbclid`.
5. Check **Application → Cookies** for `_fbc`, `_fbp`, `_fbi`.

## event_id strategy

- Funnel: client UUID prefixed (`vc_`, `atc_`, `ic_`)
- Purchase: deterministic order UUID (`purchaseEventId`)
- QualifiedOrder: `qualified-order:{orderId}`
- DeliveredOrder: `delivered-order:{orderId}`
- Retries reuse the same `event_id`

## Attribution persisted on Order

- `metaFbp`, `metaFbc` — verbatim from Parameter Builder at checkout
- `utmSource` … `utmTerm` — first-touch session
- `marketingConsent` — snapshot from client

## Consent behavior

Categories: `necessary` | `analytics` | `marketing`. Meta Pixel + browser funnel = **marketing**.

| Surface | Consent required? |
| --- | --- |
| Client ParamBuilder cookies (`_fbc`, `_fbp`, `_fbi`) | **No** — first-party attribution |
| Browser Pixel + funnel CAPI | **Yes** |
| Server CAPI **Purchase** | **No** — first-party order data |
| QualifiedOrder / DeliveredOrder CAPI | **Yes** (`marketingConsent === false` → SKIPPED) |

Consent key: `localStorage` → `malikat_consent_v1`.

## Generic endpoint security (`POST /api/meta/events`)

- Allowlist: `ViewContent`, `AddToCart`, `InitiateCheckout` only
- **Purchase rejected**
- Invalid fbp/fbc dropped (format check only — values never altered)
- Origin/referer soft check, rate limit, marketing consent

## Failure behavior

Order create never fails because of Meta. CAPI runs after DB save; failures logged in `MetaEventLog` without raw PII.

## Admin retry

`POST /api/admin/meta-events/retry`

```json
{ "orderId": "<uuid>", "eventName": "Purchase" }
```

Re-sends FAILED, missing, consent-skipped, or stuck PENDING Purchase events. Uses the order’s original `createdAt` as `event_time`.

## Backfill failed purchases

### Admin UI (recommended)

1. Open **Admin → Orders**
2. Use the **Meta — Purchase funnel** panel at the top
3. Click **Preview backfill** to see how many orders will be sent
4. Click **Resend missed purchases** to push up to 50 orders to Meta

Per order: open the order modal → **Resend Purchase to Meta** when Purchase is not **Sent**.

### API

`GET /api/admin/meta-events/diagnostics` — counts sent / failed / missing + attribution coverage

`POST /api/admin/meta-events/backfill`

```json
{ "dryRun": true, "limit": 50 }
{ "limit": 50, "orderIds": ["<uuid>"] }
```

### CLI (server with DATABASE_URL)

```bash
npm run meta:backfill:dry   # preview
npm run meta:backfill       # send up to 50
npx tsx scripts/backfill-meta-purchases.ts --order-id=<uuid>
```

After backfill, check **Events Manager → Overview** (15–30 min delay). Old orders may be outside Meta’s attribution window if placed weeks ago.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | Yes (Pixel) | Public |
| `META_PIXEL_ID` | Optional | Server override |
| `META_CAPI_ACCESS_TOKEN` | Yes (CAPI) | Secret — hPanel only |
| `META_CAPI_TEST_EVENT_CODE` | Testing only | Remove for live ads |

Missing Meta config → analytics skipped; checkout still works.

## Key files

| Area | Files |
| --- | --- |
| Client ParamBuilder | `src/lib/meta-param-builder-client.ts`, `AttributionCapture.tsx` |
| Server ParamBuilder | `src/lib/meta-param-builder-server.ts`, `meta-request-ip.ts` |
| First-touch fbclid | `src/lib/meta-first-touch.ts`, `meta-browser-cookies.ts` |
| CAPI send | `src/lib/meta-capi-server.ts`, `order-lifecycle-analytics.ts` |
| Routes | `src/app/api/orders/route.ts`, `src/app/api/meta/events/route.ts`, `src/app/api/meta/client-ip/route.ts` |
| Pixel | `src/components/MetaPixel.tsx`, `meta-pixel-events.ts` |

## Packages (Meta official, v1.3.1)

```json
"capi-param-builder-nodejs": "^1.3.1",
"meta-capi-param-builder-clientjs": "^1.3.1"
```
