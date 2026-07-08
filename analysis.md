# MalikatAbayat Store — Project Analysis

Deep overview of **MalikatAbayat Store**: purpose, architecture, evolution, strengths, gaps, and recommendations.

> **Folder note:** The application code lives in `youth-store/` and the local database is named `youthstore` — both are legacy names from a prior project. The store brand and product name is **MalikatAbayat Store** (Arabic: ملكة العبايات — “Queen of Abayas”).

---

## Executive summary

**MalikatAbayat Store** is a bilingual/trilingual e-commerce storefront for women's abayas, targeting Morocco with **cash-on-delivery (COD)** ordering. It is built as a **Next.js 16** full-stack app with **MySQL + Prisma**, **next-intl** for English/Arabic/French, and a custom **admin dashboard** for catalog and order management.

The project lives in a thin monorepo wrapper (`curator-main/`) that delegates to the main app in `youth-store/`. The codebase was originally a youth/streetwear store and was rebranded and reoriented into MalikatAbayat Store — a modest women's abaya boutique.

---

## Business model & user flows

### Storefront (customer)

1. Browse homepage with brand story, collections, and journal articles
2. Shop abayas at `/products` with category filters and price sorting
3. View product detail: images, description, size, color variant
4. Submit COD order (name, phone, city) — no online payment
5. Land on thank-you confirmation page

### Admin (merchant)

1. Log in at `/admin/login` (JWT cookie session, 7-day expiry)
2. Dashboard: KPIs, sales chart, recent orders
3. Manage orders list
4. CRUD abayas with multi-image upload and trilingual fields

### Locales

| Locale | Direction | Notes |
|--------|-----------|-------|
| `en` | LTR | Default |
| `ar` | RTL | Cairo font for body/headlines |
| `fr` | LTR | Moroccan French market |

URLs do **not** include locale prefixes (`localePrefix: "never"`). Language is switched via cookie/header and the locale switcher in the header.

---

## Technology stack

| Layer | Choice | Version (approx.) |
|-------|--------|-------------------|
| Framework | Next.js (App Router) | 16.2 |
| UI | React | 19.2 |
| Styling | Tailwind CSS v4 | 4.x |
| Database | MySQL | 9.7 (local via micromamba) |
| ORM | Prisma | 6.19 |
| i18n | next-intl | 4.9 |
| Auth | bcryptjs + jose (JWT) | — |
| Charts (admin) | Recharts | 3.8 |
| 3D (optional hero) | Three.js + R3F | present but not primary |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   MalikatAbayat Store (Browser)                │
├─────────────────────────────────────────────────────────────┤
│  Storefront (SSR/RSC)          │  Admin (client dashboard)  │
│  - Home, Products, Detail      │  - Orders, Products CRUD   │
│  - OrderForm (client)          │  - Image uploader          │
├─────────────────────────────────────────────────────────────┤
│  next-intl middleware (proxy.ts) — locale + upload redirects │
├─────────────────────────────────────────────────────────────┤
│  API Routes (Node.js runtime)                                │
│  /api/orders  /api/products  /api/auth/*  /api/admin/*       │
│  /api/uploads/[...path]                                      │
├─────────────────────────────────────────────────────────────┤
│  Prisma Client → MySQL (database: youthstore)                │
│  products | orders | admin_users                             │
├─────────────────────────────────────────────────────────────┤
│  File storage: youth-store/public/uploads/p/                 │
└─────────────────────────────────────────────────────────────┘
```

### Key design decisions

1. **COD-only checkout** — No payment gateway; orders are lead captures for phone follow-up. Keeps scope small and fits local market habits.

2. **JSON columns for flexibility** — `categories`, `images`, and `colorVariants` on `Product` are JSON arrays, avoiding join tables. Good for rapid iteration; weaker for complex queries.

3. **Admin via same Next app** — No separate admin SPA. Dashboard is a large client component (`AdminDashboard.tsx`) calling REST APIs.

4. **Image serving via API route** — `/api/uploads/[...path]` serves files from `public/`, with middleware redirects from legacy `/uploads/p/` paths.

5. **Local MySQL without Docker** — `youth-store/scripts/start-mysql.sh` bootstraps micromamba + MySQL on port 3307 for WSL/dev environments.

6. **Build-time DB hook** — `scripts/deploy-db.cjs` runs migrations (and optionally seed) before `next build`, tolerating missing DB in CI.

---

## Data model

### Product

- Trilingual: `name`, `nameAr`, `nameFr`, `description*`
- `price` (Decimal MAD)
- `categories` — JSON string array, e.g. `["Abaya", "Classic", "New"]`
- `images` — JSON array of paths like `/uploads/p/abc.jpg`
- `colorVariants` — JSON array of `{ name, hex }`

### Order

- Customer: `customerName`, `phone`, `city`
- `selectedColor` (optional)
- FK to `Product` (restrict delete)

### AdminUser

- `email` (unique), `passwordHash` (bcrypt)

---

## Brand & design system

MalikatAbayat Store visual identity is derived from `youth-store/public/logo.png`:

- **Gold** `#B88E4F` — primary accent, CTAs, prices
- **Black** `#0A0A0A` — header, footer, dark sections
- **Ivory/cream** `#FAF7F2` — page backgrounds

Implemented in `src/app/globals.css` with utility classes:

- `btn-brand`, `btn-brand-outline`, `btn-brand-ghost`
- `brand-eyebrow`, `brand-divider`, `brand-gold-text`, `brand-section-dark`

Reusable `BrandButton` component wraps the three CTA variants.

Typography: **Inter** (sans), **Newsreader** (headlines), **Cairo** (Arabic).

---

## Internationalization

- Messages: `youth-store/messages/{en,ar,fr}.json`
- Product fields: stored per-locale in DB; `getLocalizedProductFields()` picks the right column
- RTL: `dir="rtl"` on `<html>` for Arabic; Cairo font swap in CSS
- Price formatting: `formatMad()` in `lib/format-price.ts`

---

## Security analysis

| Area | Status | Notes |
|------|--------|-------|
| Admin auth | Adequate for internal tool | JWT in httpOnly cookie; 7-day TTL |
| Password storage | Good | bcrypt (cost 12) in seed |
| API authorization | Partial | GET/POST products and orders split: public POST orders, admin-only GET orders and product mutations |
| CSRF | Default | Same-site cookies; no explicit CSRF tokens on forms |
| Input validation | Basic | Type checks on order API; admin payloads parsed in lib |
| Secrets | Dev defaults | `JWT_SECRET` and admin password must be rotated for production |
| File upload | Admin-only | `/api/admin/product-images` should verify admin session |

**Recommendation:** Audit all `/api/products` and `/api/admin/*` routes for consistent auth checks before public deployment.

---

## Current catalog (seed)

10 abaya products across categories: Classic, Embroidered, Open, Kimono, Prayer, Occasion, New. Product images reuse existing modest-wear photography from a prior catalog — placeholders until real abaya shoots are uploaded.

Preset admin categories: `Abaya`, `Classic`, `Embroidered`, `Open`, `Kimono`, `Prayer`, `New`, `Occasion`.

---

## Strengths

1. **Clear brand focus** — MalikatAbayat Store copy, navigation, and categories aligned to abaya retail
2. **Trilingual from day one** — EN/AR/FR with RTL support
3. **Simple merchant workflow** — Admin can add abayas with photo upload without external CMS
4. **Local dev story** — One-script MySQL + migrate + seed for WSL
5. **Cohesive visual system** — Logo-inspired gold/black/ivory palette
6. **COD flow** — Minimal friction for Moroccan customers

---

## Gaps & technical debt

| Item | Severity | Description |
|------|----------|-------------|
| Legacy folder/DB names | Low | App folder is still `youth-store`; DB is still `youthstore` — brand is MalikatAbayat Store |
| Hero image | Medium | `hero1.jpg` may be missing; fallback to external CDN images on homepage |
| Newsletter | Low | Client-side only; no backend subscription storage |
| Search | Low | Mobile nav shows search but it is not implemented |
| Customer accounts | N/A | No user registration (by design for COD) |
| Payment | N/A | No online payment (by design) |
| Email/SMS notifications | Medium | Orders not emailed to admin or customer |
| Inventory/stock | Medium | No stock tracking or “sold out” state |
| SEO | Low | Basic metadata; no structured data for products |
| Tests | High | No automated test suite observed |
| TypeScript strictness | Low | Admin login `redirect()` typing issue in build |
| Image optimization | Medium | Many images use `unoptimized` flag |

---

## Evolution timeline (inferred)

1. **Original** — Youth/streetwear store (tracksuits, men's categories) in `youth-store/`
2. **Rebrand** — MalikatAbayat Store naming, logo, metadata
3. **Cleanup** — Removed Hostinger/DNS wrapper files, Zone.Identifier artifacts
4. **Local dev** — Micromamba MySQL, local `.env`, setup scripts
5. **Concept pivot** — Abaya-focused copy, seed catalog, category nav
6. **Design pass** — Logo-derived color system, BrandButton, dark header/footer

---

## Recommended next steps

### Short term
- Replace homepage/product photography with real abaya images
- Add order notification (email or WhatsApp webhook) on POST `/api/orders`
- Fix admin login page TypeScript redirect for clean production builds
- Add `robots.txt` and product Open Graph tags

### Medium term
- Stock quantity field on products
- Server-side newsletter endpoint (Mailchimp, Resend, etc.)
- Product search and filtering by price range
- Export orders to CSV from admin
- Optionally rename `youth-store/` → `malikatabayat-store/` and DB `youthstore` → `malikatabayatstore`

### Long term
- Optional online payment (CMI, PayPal, Stripe Morocco)
- Multi-admin roles and audit log
- CDN for product images (S3/R2)
- Separate admin subdomain with stricter CSP

---

## Deployment considerations

- **Node hosting:** Vercel, Railway, VPS with `npm run build && npm start` (from `youth-store/`)
- **Database:** Managed MySQL (Railway, AWS RDS, Hostinger MySQL, etc.)
- **Env:** Set `DATABASE_URL`, `JWT_SECRET`, production `ADMIN_*` for seed
- **Uploads:** Persist `public/uploads/` or move to object storage; ephemeral filesystems on serverless hosts will lose uploads
- **Migrations:** Run `prisma migrate deploy` on deploy; avoid `db push` in production

---

## Conclusion

MalikatAbayat Store is a focused, maintainable COD boutique built on modern Next.js patterns. It is well-suited for a single merchant selling abayas in Morocco with trilingual support and a lightweight admin. The main work ahead is operational (real product media, order notifications, production hardening) rather than architectural rewrites. Legacy folder and database names (`youth-store`, `youthstore`) do not affect storefront branding but may be renamed later for clarity.
