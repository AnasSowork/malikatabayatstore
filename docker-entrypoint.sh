#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  prisma migrate deploy
fi
exec node server.js
