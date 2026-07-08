# MalikatAbayat Store — Instructions

Step-by-step guide for running, configuring, and operating **MalikatAbayat Store** locally and in production.

> **Folder note:** The store app lives in the `youth-store/` directory (legacy folder name from an earlier project). All commands below use that path. The product/brand name is **MalikatAbayat Store**.

---

## Prerequisites

- **Node.js** 20+ and npm
- **Linux / WSL2** (local MySQL script targets Linux)
- Optional: Docker (if you prefer containerized MySQL instead of the bundled micromamba setup)

---

## First-time local setup

### 1. Install dependencies

From the repository root:

```bash
npm install
```

Or from the app directory:

```bash
cd youth-store
npm install
```

### 2. Configure environment

Copy the example env file and adjust if needed:

```bash
cd youth-store
cp .env.example .env
```

Default local values:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `mysql://root@localhost:3307/youthstore` | MySQL connection (legacy DB name) |
| `JWT_SECRET` | `change-me-in-production` | Admin session signing |
| `ADMIN_EMAIL` | `admin@malikatabayat.local` | Seed admin account |
| `ADMIN_PASSWORD` | `admin123` | Seed admin password |

### 3. Start database, migrate, and seed

One command (recommended):

```bash
cd youth-store
npm run setup:local
```

Or step by step:

```bash
npm run mysql:start    # Start local MySQL on port 3307
npm run db:migrate     # Apply Prisma migrations
npm run db:seed        # Create admin user + sample abayas
```

### 4. Start the dev server

From repo root:

```bash
npm run dev
```

Or from `youth-store`:

```bash
npm run dev
```

Open **http://localhost:3000**

---

## Admin access

| Field | Value |
|-------|-------|
| URL | http://localhost:3000/admin/login |
| Email | `admin@malikatabayat.local` |
| Password | `admin123` (from `.env` `ADMIN_PASSWORD`) |

After login you can manage orders and abayas at `/admin`.

If login fails after changing `.env`, re-run the seed so the password hash updates:

```bash
npm run db:seed
```

---

## Daily development workflow

```bash
# Terminal 1 — ensure MySQL is running
cd youth-store && npm run mysql:start

# Terminal 2 — dev server
npm run dev
```

MySQL data persists in `youth-store/.data/mysql/` (gitignored).

---

## Common tasks

### Reset the product catalog

This **deletes all orders and products**, then re-seeds abayas:

```bash
cd youth-store
FORCE_SEED=1 npm run db:seed
```

### Add or edit products

1. Log in at `/admin/login`
2. Go to **Abayas** → **Add abaya** or edit an existing item
3. Upload at least one photo (saved to `public/uploads/p/`)
4. Set name/description in EN, AR, and FR
5. Choose categories: `Abaya`, `Classic`, `Embroidered`, `Open`, `Kimono`, `Prayer`, `New`, `Occasion`

### Change storefront copy

Edit translation files inside `youth-store/`:

- `messages/en.json`
- `messages/ar.json`
- `messages/fr.json`

No rebuild needed in dev — save and refresh.

### Change brand colors or buttons

Edit `youth-store/src/app/globals.css` (design tokens and `.btn-brand*` classes).

### Replace the logo

Replace `youth-store/public/logo.png`. Used in header, footer, favicon, admin, and thank-you page.

---

## Production build

```bash
cd youth-store
npm run build
npm start
```

The build script runs `scripts/deploy-db.cjs`, which attempts `prisma migrate deploy` and optional seeding. Ensure `DATABASE_URL` and `JWT_SECRET` are set in production.

Build without a database (migrations skipped):

```bash
# Leave DATABASE_URL empty or unset in .env
npm run build
```

---

## Environment variables reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (runtime) | MySQL URL, e.g. `mysql://user:pass@host:3306/dbname` |
| `JWT_SECRET` | Yes (prod) | Secret for admin JWT cookies |
| `ADMIN_EMAIL` | Seed only | Admin email created/updated on seed |
| `ADMIN_PASSWORD` | Seed only | Admin password hashed on seed |
| `FORCE_SEED` | Optional | `1` or `true` — wipe orders/products and re-seed |
| `SKIP_SEED` | Optional | Skip seed during build deploy script |
| `NODE_ENV` | Auto | `production` enables secure cookies |

---

## Troubleshooting

### `Can't reach database server at localhost:3307`

MySQL is not running. Start it:

```bash
cd youth-store && npm run mysql:start
```

### Port 3000 already in use

Stop the other process or run on another port:

```bash
PORT=3001 npm run dev
```

### `[seed] Catalog already has products — skipping`

Seed skips product creation when products exist (to preserve orders). To reset:

```bash
FORCE_SEED=1 npm run db:seed
```

### Missing translation key errors in browser

A component references a key not present in all three `messages/*.json` files. Add the key to `en.json`, `ar.json`, and `fr.json`.

### Product images not loading

- Uploads are served via `/api/uploads/p/...`
- Legacy paths `/uploads/p/...` redirect automatically
- Ensure files exist under `youth-store/public/uploads/p/`

### Docker permission denied (WSL)

MalikatAbayat Store includes a **micromamba MySQL** fallback that does not require Docker. Use `npm run mysql:start` instead of Docker Compose.

---

## Repository layout (quick reference)

```
curator-main/                 # Monorepo wrapper (npm scripts delegate to youth-store)
└── youth-store/              # MalikatAbayat Store app (legacy folder name)
    ├── messages/             # i18n strings (en, ar, fr)
    ├── prisma/               # Schema, migrations, seed
    ├── public/               # Static assets (logo, uploads)
    ├── scripts/              # MySQL bootstrap, deploy-db, local-setup
    ├── instructions.md       # This file
    ├── analysis.md           # Project analysis
    ├── documentation.md      # Technical reference
    └── src/
        ├── app/              # Pages and API routes
        ├── components/       # UI components
        ├── i18n/             # Locale routing config
        └── lib/              # Auth, Prisma, product helpers
```

---

## Security reminders for production

1. Set a strong `JWT_SECRET`
2. Change `ADMIN_PASSWORD` and re-seed before going live
3. Use HTTPS so admin cookies get the `secure` flag
4. Never commit `.env` (it is gitignored)
5. Do not commit credentials or customer PII
