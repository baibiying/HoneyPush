A minimal Next.js starter for building apps inside the [Eazo](https://eazo.ai) platform. Includes a working example of the Eazo session token flow: the app requests the encrypted user token from the host via `postMessage`, sends it to a Next.js API route, decrypts it server-side with `@eazo/node-sdk`, and returns the user profile.

## Production

| Environment | URL |
|---|---|
| Vercel (production) | [https://honeypush.vercel.app](https://honeypush.vercel.app) |

`*.vercel.app` may be slow or blocked in mainland China.

## Getting Started

### 1. Local database (Docker)

Register, login, and tasks need PostgreSQL. Start the dev database with Docker Compose (`docker-compose.yml`):

```bash
docker compose up -d
```

Default connection (also in `.env.example`):

`postgresql://postgres:postgres@localhost:5432/honeypush`

### 2. Install and configure

```bash
bun install
cp .env.example .env
bun run db:migrate
```

If `bun install` stalls on `sharp`, use:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 bun install
```

### 3. Run the app

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Docker Postgres running, the app will show a database connection error (see `src/lib/db/errors.ts`).

## Environment Variables

`.env` is created in step 2 above. Main variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required for tasks and auth). |
| `LLM_API_KEY` | API key for AI task parsing and scheduling (OpenAI-compatible). Without it, rule-based fallback is used. |
| `LLM_BASE_URL` | Optional. Defaults to `https://api.openai.com/v1`. Use provider base URL (e.g. DeepSeek `https://api.deepseek.com/v1`). |
| `LLM_MODEL` | Optional. Defaults to `gpt-4o-mini`. |
| `EAZO_PRIVATE_KEY` | Optional. Eazo session decryption when embedded in the Eazo app. |

`OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` are accepted as aliases for the LLM settings. Never expose API keys to the browser.

## Learn More

- [Eazo Documentation](https://docs.eazo.ai)
- [Next.js Documentation](https://nextjs.org/docs)

## Deploy (Vercel)

Live: [https://honeypush.vercel.app](https://honeypush.vercel.app)

```bash
vercel deploy --prod
```

Requires `DATABASE_URL` (e.g. [Neon](https://neon.tech) PostgreSQL) in the Vercel project settings. The build runs database migrations via `vercel.json` → `scripts/vercel-build.mjs`.

Optional env vars: `LLM_API_KEY` (AI scheduling), `CRON_SECRET` (daily notification cron in `vercel.json`).

**Note:** `*.vercel.app` may need VPN in mainland China.
