A minimal Next.js starter for building apps inside the [Eazo](https://eazo.ai) platform. Includes a working example of the Eazo session token flow: the app requests the encrypted user token from the host via `postMessage`, sends it to a Next.js API route, decrypts it server-side with `@eazo/node-sdk`, and returns the user profile.

## Getting Started

Install dependencies with Bun:

```bash
bun install
```

If dependency installation stalls on this machine during `sharp` setup, use:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 bun install
```

Then start the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Copy `.env.example` to `.env` and fill in your private key:

```bash
cp .env.example .env
```

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

## Deploy

### Vercel (overseas)

```bash
vercel deploy --prod
```

Requires `DATABASE_URL` (Neon) in project settings.  
**Note:** `*.vercel.app` may need VPN in mainland China.

### Docker (recommended for China users)

See [docs/DEPLOY-CHINA.md](docs/DEPLOY-CHINA.md) — self-host on a HK/CN VPS so users can open the app **without VPN**.

```bash
cp .env.production.example .env.production
docker compose -f docker-compose.prod.yml up -d --build
```
