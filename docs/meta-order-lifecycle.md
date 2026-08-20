# Meta order lifecycle analytics (Step 3)

COD quality feedback loop on top of Phase 2 Purchase (= order submitted).

## Status flow

```
PENDING
  ↓ (admin confirm)
CONFIRMED          → QualifiedOrder (Meta CAPI custom, once)
  ↓ (create shipment via shipping service / admin)
SHIPPED            → no Meta event
  ↓ (admin deliver)
DELIVERED          → DeliveredOrder (Meta CAPI custom, once)

Alternatives:
  * → CANCELLED    → CancelledOrder recorded internally only (SKIPPED log)
  * → RETURNED     → ReturnedOrder recorded internally only (SKIPPED log)
```

## Transition detection

All status mutations go through:

1. Persist Order row
2. Compare **previous** status vs **new** status
3. `scheduleOrderStatusTransition` → `handleOrderStatusTransition`

**Paths that change status**

| Path | Effect |
| --- | --- |
| `PATCH /api/orders/[id]` | Admin edit / confirm / deliver / cancel / return |
| `POST /api/orders/[id]/ship` | Sets `SHIPPED` via shipping service → active provider adapter |
| `POST /api/orders` (admin create) | Lifecycle if created as non-`PENDING` |

No Meta calls from React admin components.

## Events per transition

| Transition | Analytics |
| --- | --- |
| `* → CONFIRMED` (first) | `QualifiedOrder` CAPI (or SKIPPED if no marketing consent) |
| `CONFIRMED → CONFIRMED` | None |
| `* → SHIPPED` | None (operational only) |
| `* → DELIVERED` (first) | `DeliveredOrder` CAPI |
| `DELIVERED → DELIVERED` | None |
| `* → CANCELLED` (first) | Internal `CancelledOrder` log only |
| `* → RETURNED` (first) | Internal `ReturnedOrder` log only |
| Create `PENDING` | Purchase (Phase 2) — not this service |

## Architecture choice: MetaEventLog only

No separate `OrderLifecycleEvent` table.

- Positive Meta sends: `SENT` / `FAILED` / `SKIPPED` (consent)
- Cancelled / Returned: one row with `SKIPPED` + `errorCode=internal_only_not_sent_to_meta`

Keeps a single place to answer “was QualifiedOrder sent?” without misusing logs as full Graph payloads (still no PII).

## Matching (lifecycle)

From Order snapshot: phone, name, city, country `ma`, `metaFbp`, `metaFbc`, `external_id` = order id. No client IP/UA (not persisted).

## Retry

- `sendOrRetryMetaOrderEvent` — idempotent; SENT/SKIPPED never re-sent
- Admin: `POST /api/admin/meta-events/retry` with `{ orderId, eventName? }` — FAILED only by default

Meta failure never rolls back order status.

## Shipping providers

Primary: **Sendit** (`SHIPPING_PROVIDER=sendit`). Legacy: Olivraison. Local `Order.status` remains the only Meta input. See [`shipping-architecture.md`](./shipping-architecture.md) and [`sendit-integration.md`](./sendit-integration.md).

`DELIVERED` may originate from:

- admin PATCH, or
- Sendit webhook / admin sync after **authenticated** `GET /deliveries/{code}` (webhook body status is not trusted)

Either path uses `scheduleOrderStatusTransition` → DeliveredOrder (consent-aware).
