# Step 7 — Staging go-live validation

## Status (this workspace)

**NO-GO for production** until staging is executed on a host with:

- reachable MySQL
- Meta CAPI + test event code
- Sendit TEST keys + webhook secret
- HTTPS staging URL

Local agent environment (2026-08-20):

| Check | Result |
| --- | --- |
| Staging `.env` Meta CAPI | MISSING |
| Staging `.env` Sendit | MISSING |
| Local MySQL `localhost:3307` | unreachable (no Docker socket) |
| Outbound HTTPS to live domain / Sendit | blocked (proxy 403) |
| Automated code verify scripts | PASS |
| Migrations SQL review | additive only (safe) |

Do **not** treat code-PASS as Meta Events Manager or Sendit dashboard PASS.

---

## Host-side commands (run ON staging)

```bash
cd /path/to/youth-store

# 1) Config presence (no secrets printed)
node scripts/audit-env-presence.mjs .env
node scripts/staging-go-live-checklist.mjs

# 2) Migrations (staging DB only)
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status

# 3) Health (after app is up)
BASE_URL=https://YOUR-STAGING-HOST node scripts/staging-go-live-checklist.mjs

# 4) Sendit city matrix (TEST keys)
node scripts/staging-go-live-checklist.mjs --city-matrix

# 5) Webhook invalid-secret probe
BASE_URL=https://YOUR-STAGING-HOST node scripts/staging-go-live-checklist.mjs --webhook-probe
```

---

## Manual Meta matrix (Events Manager → Test Events)

Use `META_CAPI_TEST_EVENT_CODE` on staging only.

| Test | Result | Evidence |
| --- | --- | --- |
| PageView | | |
| ViewContent | | |
| AddToCart semantics | | |
| InitiateCheckout | | |
| Purchase browser | | |
| Purchase server | | |
| Purchase same event_id / dedupe | | |
| Thank-you refresh ×5 | | |
| QualifiedOrder once | | |
| DeliveredOrder once | | |
| Consent reject → SKIPPED | | |

---

## Manual Sendit matrix

| Test | Result | Evidence |
| --- | --- | --- |
| Create shipment | | |
| Duplicate create blocked | | |
| City mapping table | | |
| Sync status | | |
| Delivered via sync/webhook | | |
| Delivered dedupe | | |
| Failure leaves order unshipped | | |
| Invalid webhook secret → 401 | | |

---

## Migration review (code)

Additive — no DROP:

1. `20260820180000_order_meta_attribution_event_log` — attribution columns + `meta_event_logs`
2. `20260820220000_order_generic_shipping_fields` — `shippingProvider`, `shippingTrackingId` (+ indexes)

Legacy `olivraisonTrackingId` retained.

---

## Custom conversions (prepare only — no campaign change)

After QualifiedOrder / DeliveredOrder appear in Events Manager:

1. Meta Events Manager → Custom conversions → Create
2. **Qualified COD Order** — custom event `QualifiedOrder`
3. **Delivered COD Order** — custom event `DeliveredOrder`
4. Leave ad set optimization on existing Purchase until production volume exists

---

## Production deployment sequence (only after GO)

1. Production backup (DB + app)
2. Confirm env vars (CONFIGURED checklist; no values in chat)
3. Deploy application build
4. `npx prisma migrate deploy`
5. Verify `/api/health` (metaCapi + sendit + provider)
6. Configure Sendit production webhook HTTPS URL (secret not logged)
7. One controlled real test order
8. Verify Meta Events Manager + MetaEventLog
9. Verify Sendit shipment + sync
10. Monitor logs / MetaEventLog
11. Full release

Do **not** switch campaign optimization to DeliveredOrder in this step.
