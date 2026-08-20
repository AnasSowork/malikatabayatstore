# Step 6 — End-to-end validation notes

Architecture is validated in code with automated checks. Live Meta Events Manager and Sendit staging require credentials and must be run manually before declaring full production GO.

## Authoritative event paths (code audit)

| Event | Browser | Server | Authoritative trigger |
| --- | --- | --- | --- |
| PageView | MetaPixel `fbq('track','PageView')` | — | Locale layout Pixel init |
| ViewContent | `trackViewContent` | `/api/meta/events` | Product detail mount |
| AddToCart | `trackAddToCart` | `/api/meta/events` | Bundle quantity select only |
| InitiateCheckout | `trackInitiateCheckout` | `/api/meta/events` | Checkout submit |
| Purchase | Thank-you Pixel only (`flushPendingPurchase`) | `POST /api/orders` CAPI | PENDING order create |
| QualifiedOrder | — | Lifecycle CAPI | First → CONFIRMED |
| DeliveredOrder | — | Lifecycle CAPI | First → DELIVERED |

`/api/meta/events` **rejects** Purchase. Thank-you does **not** call CAPI Purchase.

## Deterministic event IDs

- Purchase: `orderId`
- QualifiedOrder: `qualified-order:{orderId}`
- DeliveredOrder: `delivered-order:{orderId}`

## Webhook security (Step 6 hardening)

- Body ≤ 16KB; code/ref length + charset limits
- Per-IP 60/min; global 300/min
- `SENDIT_WEBHOOK_SECRET` = **anti-abuse trigger token** (query secret ≠ HMAC auth)
- Logs never include full callback URL / secrets
- Status authority = authenticated Sendit API only

## Shipment concurrency

DB claim `pending:{orderId}` via `updateMany` where tracking is null before Sendit create.  
On failure: clear claim; attempt `findSenditCodeByReference(Order.id)` before leaving error.

## Status concurrency

`updateMany` where `id` + `status = previous` before applying DELIVERED/RETURNED/CANCELLED.

## Staging checklist (manual)

1. `META_CAPI_TEST_EVENT_CODE` + Events Manager Test Events  
2. Full order → confirm → ship (Sendit test key) → deliver (webhook or sync)  
3. Refresh thank-you ×5; confirm ×2; deliver × webhook+sync  
4. Consent reject → SKIPPED logs; shipping still works  
5. Create Custom Conversions for QualifiedOrder / DeliveredOrder — **do not switch campaigns yet**
