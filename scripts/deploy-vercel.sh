#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: npm i -g vercel"
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Log in to Vercel (browser will open):"
  vercel login
fi

echo ""
echo "Deploying HoneyPush to Vercel (production)..."
echo "Required env vars in Vercel project settings:"
echo "  DATABASE_URL   — PostgreSQL (Neon / Supabase / Vercel Postgres)"
echo "  LLM_API_KEY    — optional, for AI scheduling"
echo "  CRON_SECRET    — optional, for daily-digest cron in vercel.json"
echo ""

vercel deploy --prod
