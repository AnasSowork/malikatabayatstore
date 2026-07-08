# MalikatAbayat Store

Next.js e-commerce storefront for malikatalabayat.com — trilingual (EN/AR/FR), COD checkout, and admin panel.

## Local development

```bash
npm install
npm run setup:local   # optional: local MySQL
npm run dev
```

See `instructions.md` for full setup and `documentation.md` for technical reference.

## Hostinger deploy (Node.js Web App)

| Setting | Value |
|---------|-------|
| Install | `npm ci` |
| Build | `npm run build` |
| Start | `npm run start -- -p $PORT` |

Required env vars: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
