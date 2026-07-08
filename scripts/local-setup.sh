#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/start-mysql.sh"

echo "[setup] Running migrations ..."
npm run db:migrate

echo "[setup] Seeding database ..."
npm run db:seed

echo ""
echo "Local database is ready."
echo "  Store: http://localhost:3000"
echo "  Admin: http://localhost:3000/admin/login"
echo "  Login: admin@malikatabayat.local / admin123"
echo "  Start the app: npm run dev"
