# Meta event map

| Event | Business meaning | Trigger | Browser | Server | Value | event_id | Consent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PageView | Page viewed | Locale layout / Pixel init | Yes | No | — | Meta-managed | marketing |
| ViewContent | Product viewed | Product detail mount | Yes | Yes (`/api/meta/events`) | product | `vc_*` UUID | marketing |
| AddToCart | Bundle offer chosen | Quantity select (not mount) | Yes | Yes | offer | `atc_*` UUID | marketing |
| InitiateCheckout | Checkout submitted | Order form CTA | Yes | Yes | cart | `ic_*` UUID | marketing |
| **Purchase** | **COD order submitted** | `POST /api/orders` → `PENDING` | Thank-you Pixel only | Order API CAPI (always) | submitted `totalPrice` MAD | order UUID | Pixel: marketing; CAPI: always |
| **QualifiedOrder** | **COD order validated** | First transition → `CONFIRMED` | **No** | Lifecycle CAPI custom | confirmed `totalPrice` MAD | `qualified-order:{orderId}` | marketing |
| **DeliveredOrder** | **Successfully delivered** | First transition → `DELIVERED` | **No** | Lifecycle CAPI custom | delivered `totalPrice` MAD | `delivered-order:{orderId}` | marketing |

## Internal-only (not sent to Meta CAPI in Step 3)

| Concept | Trigger | Storage | Meta |
| --- | --- | --- | --- |
| CancelledOrder | First → `CANCELLED` | `MetaEventLog` `SKIPPED` (`internal_only_not_sent_to_meta`) | Not sent |
| ReturnedOrder | First → `RETURNED` | Same | Not sent |
| SHIPPED | → `SHIPPED` | Order status only | Not sent |

## Value semantics

| Event | Value meaning |
| --- | --- |
| Purchase | Submitted COD order value |
| QualifiedOrder | Confirmed COD order value |
| DeliveredOrder | Successfully delivered order value |

Currency: **MAD**. Product identity = same `productId` / `content_ids` as Purchase.

## Custom events to Meta

Meta CAPI accepts custom `event_name` strings. This app sends:

- `QualifiedOrder`
- `DeliveredOrder`

as **server-only** custom events (`action_source: website`). They are **not** Pixel events and are **not** accepted on `/api/meta/events`.

## Idempotency

Unique `(orderId, eventName)` in `MetaEventLog`. Identical status PATCHes do not re-emit. Retries reuse the same deterministic `event_id`.

## Consent

If `Order.marketingConsent === false`:

- **Purchase** server CAPI still sends (first-party order).
- **QualifiedOrder / DeliveredOrder** are **SKIPPED**.

Status transitions still succeed.
