#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Running database migrations..."
  npx tsx ./src/lib/db/migrate.ts || {
    echo "Migration failed — check DATABASE_URL"
    exit 1
  }
fi

exec "$@"
