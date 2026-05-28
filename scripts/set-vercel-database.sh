#!/usr/bin/env bash
# Usage: ./scripts/set-vercel-database.sh 'postgresql://user:pass@host/db?sslmode=require'
set -euo pipefail

cd "$(dirname "$0")/.."

if [ $# -lt 1 ]; then
  echo "Usage: $0 '<DATABASE_URL>'"
  echo ""
  echo "Example (Neon): postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
  exit 1
fi

URL="$1"

if [[ "$URL" == *localhost* ]] || [[ "$URL" == *127.0.0.1* ]]; then
  echo "Refusing local DATABASE_URL for production."
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Run: vercel login"
  exit 1
fi

printf '%s' "$URL" | vercel env add DATABASE_URL production
printf '%s' "$URL" | vercel env add DATABASE_URL preview

echo ""
echo "DATABASE_URL set for production + preview."
echo "Redeploy: vercel deploy --prod"
