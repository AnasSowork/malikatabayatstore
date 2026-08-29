# Shipping architecture

Provider-agnostic fulfillment. **Sendit** is the only supported shipping provider.

## Flow

```text
Admin → POST /api/orders/[id]/ship
  → shippingService.createShipmentForOrder
  → active ShippingProvider (SHIPPING_PROVIDER)
  → Sendit adapter
  → persist shippingProvider + shippingTrackingId
  → Order.status = SHIPPED
  → scheduleOrderStatusTransition (no Meta SHIPPED event)
```

## Status automation (Step 5)

```text
Sendit webhook POST /api/webhooks/sendit
  → optional shared-secret gate
  → extract shipment code / Order.id reference
  → authenticated GET /deliveries/{code}  (authoritative — not webhook body status)
  → normalizeSenditStatus
  → transition guard
  → local Order status
  → scheduleOrderStatusTransition
  → Meta lifecycle (DeliveredOrder / internal Cancelled|Returned)
```

Admin recovery: `POST /api/admin/shipping/{orderId}/sync` + modal **Sync shipping status**.

End-to-end business + Meta:

```text
META AD → Website → Purchase (PENDING)
  → admin CONFIRMED → QualifiedOrder → Meta
  → Create shipment → SENDIT → SHIPPED
  → Sendit delivery → verified sync → DELIVERED (local)
  → DeliveredOrder → Meta
```

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `SHIPPING_PROVIDER` | `sendit` | Must be `sendit` |
| `SENDIT_PUBLIC_KEY` / `SENDIT_SECRET_KEY` | — | Sendit login |
| `SENDIT_API_BASE_URL` | `https://app.sendit.ma/api/v1` | |
| `SENDIT_PICKUP_DISTRICT_ID` | `46` | Casablanca per OpenAPI |
| `SENDIT_WEBHOOK_SECRET` | — | Optional webhook gate |

## Meta boundary

Lifecycle/Meta never import shipping providers. Shipping adapters never import Meta.

See: [`sendit-integration.md`](./sendit-integration.md), [`meta-order-lifecycle.md`](./meta-order-lifecycle.md).
