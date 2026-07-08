# MalikatAbayat Store — Technical Documentation

Reference for developers working on **MalikatAbayat Store**: routes, APIs, components, configuration, and conventions.

> **Folder note:** All paths below use `youth-store/` — the legacy directory name for this app. The store brand is **MalikatAbayat Store**. The local MySQL database is named `youthstore` (also legacy).

---

## Table of contents

1. [Project structure](#project-structure)
2. [Configuration](#configuration)
3. [Database](#database)
4. [Routing & i18n](#routing--i18n)
5. [Authentication](#authentication)
6. [API reference](#api-reference)
7. [Pages](#pages)
8. [Components](#components)
9. [Design system](#design-system)
10. [Scripts](#scripts)
11. [Conventions](#conventions)

---

## Project structure

```
curator-main/                 # Monorepo root
└── youth-store/              # MalikatAbayat Store app (legacy folder name)
    ├── messages/             # next-intl JSON catalogs
    │   ├── en.json
    │   ├── ar.json
    │   └── fr.json
    ├── prisma/
    │   ├── schema.prisma
    │   ├── seed.ts           # Admin user + abaya catalog
    │   └── migrations/
    ├── public/
    │   ├── logo.png          # MalikatAbayat Store logo
    │   └── uploads/p/        # Product images (runtime)
    ├── scripts/
    │   ├── start-mysql.sh    # Local MySQL via micromamba
    │   ├── local-setup.sh    # MySQL + migrate + seed
    │   └── deploy-db.cjs     # Pre-build migrate/seed
    ├── instructions.md       # Setup & operations guide
    ├── analysis.md           # Project analysis
    ├── documentation.md      # This file
    └── src/
        ├── app/
        │   ├── globals.css   # Tailwind theme + brand tokens
        │   ├── layout.tsx    # Root layout shell
        │   ├── [locale]/     # Localized pages
        │   └── api/          # REST endpoints
        ├── components/       # React components
        ├── i18n/             # next-intl routing + navigation
        ├── lib/              # Shared server/client utilities
        └── proxy.ts          # Middleware (locale + upload redirects)
```

**Monorepo root** (`curator-main/package.json`) proxies into `youth-store/`:

| Script | Action |
|--------|--------|
| `npm run dev` | `cd youth-store && npm run dev` |
| `npm run build` | `cd youth-store && npm run build` |
| `npm run setup:local` | Full local DB setup |

---

## Configuration

### Environment variables

File: `youth-store/.env` (copy from `.env.example`)

```env
DATABASE_URL=mysql://root@localhost:3307/youthstore
JWT_SECRET=change-me-in-production
ADMIN_EMAIL=admin@malikatabayat.local
ADMIN_PASSWORD=admin123
```

### next-intl routing

File: `youth-store/src/i18n/routing.ts`

```typescript
locales: ["en", "ar", "fr"]
defaultLocale: "en"
localePrefix: "never"   // URLs are /products not /en/products
```

### Middleware

File: `youth-store/src/proxy.ts`

- Applies next-intl locale detection
- Redirects `/uploads/p/*` and `/uploads/products/*` → `/api/uploads/p/*`

---

## Database

MySQL database name (local default): **`youthstore`** (legacy).

### Prisma schema

**Product** (`products`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `name` | String | English (default) |
| `nameAr`, `nameFr` | String? | Localized names |
| `price` | Decimal(10,2) | MAD |
| `description` | Text | English |
| `descriptionAr`, `descriptionFr` | Text? | Localized |
| `categories` | Json | String array |
| `images` | Json | Path array, e.g. `/uploads/p/x.jpg` |
| `colorVariants` | Json | `{ name, hex }[]` |
| `createdAt` | DateTime | Auto |

**Order** (`orders`)

| Field | Type |
|-------|------|
| `id` | cuid |
| `customerName`, `phone`, `city` | String |
| `selectedColor` | String? |
| `productId` | FK → Product |
| `createdAt` | DateTime |

**AdminUser** (`admin_users`)

| Field | Type |
|-------|------|
| `id` | cuid |
| `email` | String @unique |
| `passwordHash` | String |

### Migrations

Run from `youth-store/`:

```bash
npm run db:migrate    # prisma migrate deploy
npm run db:push       # prisma db push (dev only)
npm run db:seed       # prisma db seed
```

### Seed behavior

- Always upserts admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Creates products only if catalog is empty **unless** `FORCE_SEED=1`
- `FORCE_SEED=1` deletes all orders and products first

---

## Routing & i18n

### URL map (locale-agnostic paths)

| Path | Page |
|------|------|
| `/` | MalikatAbayat Store homepage |
| `/products` | Abaya catalog |
| `/products?category=Classic` | Filtered catalog |
| `/products/[id]` | Product detail + order form |
| `/thank-you` | Order confirmation |
| `/admin` | Admin dashboard |
| `/admin/login` | Admin sign-in |
| `/admin/orders` | Orders view |
| `/admin/products` | Product management |

### Translation namespaces

Key files in `youth-store/messages/*.json`:

| Namespace | Usage |
|-----------|-------|
| `meta` | SEO title/description |
| `brand` | MalikatAbayat Store name strings |
| `nav` | Header links |
| `home` | Homepage sections |
| `footer` | Footer copy |
| `products` | Catalog page |
| `product` | Detail + order form |
| `admin` | Dashboard strings |
| `thankYou` | Confirmation page |
| `locale` | Language switcher labels |
| `mobileNav` | Bottom navigation |

### Product localization

`lib/product-i18n.ts` — `getLocalizedProductFields(product, locale)` returns `{ name, description }` from the appropriate DB columns.

### Price formatting

`lib/format-price.ts` — `formatMad(price, locale)` formats Moroccan Dirham per locale.

---

## Authentication

### Mechanism

- Admin logs in via `POST /api/auth/login`
- Server verifies bcrypt hash, sets JWT in cookie `malikatabayat_admin_token`
- Cookie: httpOnly, sameSite=lax, 7 days, secure in production
- `lib/auth.ts`: `signAdminToken`, `verifyAdminToken`, `getAdminSession`

### Protected routes

Admin pages check session server-side. API routes use `isAdminAuthenticated()` for mutations and order listing.

### Logout

`POST /api/auth/logout` — clears the cookie.

---

## API reference

Base URL: same origin (e.g. `http://localhost:3000`)

### Auth

#### `POST /api/auth/login`

```json
{ "email": "admin@malikatabayat.local", "password": "admin123" }
```

**Response:** `{ "ok": true }` + Set-Cookie

**Errors:** 400 missing fields, 401 invalid credentials

#### `POST /api/auth/logout`

Clears admin cookie.

---

### Orders

#### `POST /api/orders` (public)

Create COD order for MalikatAbayat Store.

```json
{
  "customerName": "Fatima Alami",
  "phone": "+212600000000",
  "city": "Casablanca",
  "productId": "clxx...",
  "selectedColor": "Black"
}
```

**Response:** 201 + order object with serialized product

**Validation:**
- All required string fields non-empty
- Product must exist
- If product has color variants, `selectedColor` must match a variant name

#### `GET /api/orders` (admin)

Returns all orders with products, newest first. **401** if not authenticated.

---

### Products

#### `GET /api/products`

Public list of all products (serialized).

#### `POST /api/products` (admin)

Create product. Body parsed by `lib/parse-product-payload.ts`.

#### `GET /api/products/[id]`

Single product by ID.

#### `PUT /api/products/[id]` (admin)

Update product.

#### `DELETE /api/products/[id]` (admin)

Delete product.

---

### Admin uploads

#### `POST /api/admin/product-images` (admin)

Multipart upload. Saves to `youth-store/public/uploads/p/`. Returns `{ paths: ["/uploads/p/..."] }`.

Supported: JPEG, PNG, WebP, GIF, AVIF.

---

### Static uploads

#### `GET /api/uploads/[...path]`

Serves files from `public/` directory. Used for product images.

---

## Pages

### Homepage — `src/app/[locale]/page.tsx`

Sections: hero (logo + CTA), featured grid, articles slider, campaign banner, category tiles (Classic / Embroidered / New).

Server component; uses `getTranslations("home")`.

### Products — `src/app/[locale]/products/page.tsx`

Server component. Query params:

| Param | Values |
|-------|--------|
| `category` | Any category string from product JSON |
| `sort` | `new` (default), `price_asc`, `price_desc` |

Includes `ProductsToolbar` (client) and `NewsletterSection`.

### Product detail — `src/app/[locale]/products/[id]/page.tsx`

Image carousel, localized copy, `ProductPurchasePanel` (size, color, `OrderForm`).

### Thank you — `src/app/[locale]/thank-you/page.tsx`

Post-order confirmation with brand CTAs.

### Admin — `src/app/[locale]/admin/*`

- `page.tsx` — Dashboard (renders `AdminDashboard`)
- `login/page.tsx` — Login form
- `orders/page.tsx`, `products/page.tsx` — Section views

---

## Components

### Storefront

| Component | File | Role |
|-----------|------|------|
| `SiteHeader` | `SiteHeader.tsx` | Sticky nav, logo, locale switcher |
| `SiteFooter` | `SiteFooter.tsx` | Dark footer, links |
| `MobileBottomNav` | `MobileBottomNav.tsx` | Mobile tab bar |
| `BrandLogo` | `BrandLogo.tsx` | MalikatAbayat Store logo |
| `BrandButton` | `BrandButton.tsx` | Primary/outline/ghost CTAs |
| `ProductCard` | `ProductCard.tsx` | Catalog grid item |
| `ProductsToolbar` | `ProductsToolbar.tsx` | Category pills + sort |
| `ProductImageCarousel` | `ProductImageCarousel.tsx` | Detail gallery |
| `ProductPurchasePanel` | `ProductPurchasePanel.tsx` | Size, color, order |
| `OrderForm` | `OrderForm.tsx` | COD submission form |
| `ColorVariantSelector` | `ColorVariantSelector.tsx` | Color swatches |
| `SizeSelector` | `SizeSelector.tsx` | Abaya sizes 52–58 |
| `NewsletterSection` | `NewsletterSection.tsx` | Email capture (client-only) |
| `ArticlesSlider` | `home/ArticlesSlider.tsx` | Homepage journal carousel |
| `LocaleSwitcher` | `LocaleSwitcher.tsx` | EN / AR / FR select |

### Admin

| Component | File | Role |
|-----------|------|------|
| `AdminLoginForm` | `AdminLoginForm.tsx` | Sign-in UI |
| `AdminDashboard` | `AdminDashboard.tsx` | Full admin SPA-like UI |
| `ProductImageUploader` | `ProductImageUploader.tsx` | Drag/drop multi-upload |

### Layout helpers

| Component | Role |
|-----------|------|
| `StorefrontMain` | Main content wrapper |
| `StorefrontOnly` | Hides footer/nav on admin |

---

## Design system

Defined in `youth-store/src/app/globals.css`.

### Brand colors (MalikatAbayat Store)

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-gold` | `#B88E4F` | Primary accent |
| `brand-gold-light` | `#D4AF6A` | Hover, nav active |
| `brand-gold-dark` | `#96703D` | Text accents |
| `brand-black` | `#0A0A0A` | Header, footer |
| `brand-ivory` | `#FAF7F2` | Page background |
| `brand-cream` | `#F3EDE3` | Cards, sections |

Semantic aliases: `primary` = gold, `on-primary` = black, `surface` = ivory.

### Button classes

| Class | Description |
|-------|-------------|
| `btn-brand` | Gold gradient fill, black text |
| `btn-brand-outline` | Gold border, fills on hover |
| `btn-brand-ghost` | Transparent on dark backgrounds |
| `btn-brand-sm` | Smaller padding |
| `btn-brand-block` | Full width |

### Utility classes

| Class | Description |
|-------|-------------|
| `brand-eyebrow` | Gold uppercase label |
| `brand-divider` | Horizontal gold gradient line |
| `brand-gold-text` | Gold text color |
| `brand-section-dark` | Black section background |
| `brand-card-glow` | Subtle gold shadow ring |

### Typography

| Role | Font |
|------|------|
| Body | Inter |
| Headlines | Newsreader |
| Arabic | Cairo (when `dir=rtl`) |

---

## Scripts

All commands run from `youth-store/` unless using the monorepo root wrappers.

| npm script | Command | Purpose |
|------------|---------|---------|
| `dev` | `next dev` | Development server :3000 |
| `build` | `deploy-db.cjs && next build --webpack` | Production build |
| `start` | `next start` | Production server |
| `lint` | `eslint` | Lint |
| `db:migrate` | `prisma migrate deploy` | Apply migrations |
| `db:push` | `prisma db push` | Sync schema (dev only) |
| `db:seed` | `prisma db seed` | Seed admin + products |
| `mysql:start` | `bash scripts/start-mysql.sh` | Local MySQL :3307 |
| `setup:local` | `local-setup.sh` | All-in-one local setup |

---

## Conventions

### Product categories

Preset list in admin (`AdminDashboard.tsx`):

```
Abaya, Classic, Embroidered, Open, Kimono, Prayer, New, Occasion
```

Products may have multiple categories. Storefront filters by exact category string in query param.

### Image paths

- Store in DB as `/uploads/p/filename.ext`
- Render via `/api/uploads/p/filename.ext` or `ProductImage` helper
- Admin upload returns paths under `/uploads/p/`

### Order flow

1. Customer submits `OrderForm`
2. `POST /api/orders`
3. Client redirects to `/thank-you`
4. Admin sees order in dashboard

### Adding a new locale

1. Add locale to `src/i18n/routing.ts`
2. Create `messages/xx.json` (copy from `en.json`)
3. Add product columns in Prisma if needed (or reuse English fallback)
4. Update `LocaleSwitcher` options via routing config

### Prisma JSON fields

Categories, images, and colorVariants are stored as JSON. When seeding or creating via API, pass JavaScript arrays — Prisma serializes automatically.

### Legacy naming

| What | Current name | Brand name |
|------|--------------|------------|
| App folder | `youth-store/` | MalikatAbayat Store |
| MySQL database | `youthstore` | MalikatAbayat Store |
| npm package | `malikat-abayat` | MalikatAbayat Store |

Folder and database names may be renamed in a future cleanup; documentation and commands use the current paths.

---

## Related files

| Topic | File |
|-------|------|
| Setup & ops | `instructions.md` |
| Architecture & gaps | `analysis.md` |
| Env template | `.env.example` |
| Agent rules (Next.js 16) | `AGENTS.md` |

---

## Version info

| Package | Version |
|---------|---------|
| next | 16.2.3 |
| react | 19.2.4 |
| prisma | 6.19.3 |
| next-intl | 4.9.1 |
| tailwindcss | 4.x |

Documentation for **MalikatAbayat Store** — application directory: `youth-store/`.
