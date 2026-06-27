FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations
COPY --from=builder /app/src/lib/db/migrate.ts ./src/lib/db/migrate.ts
COPY --from=builder /app/src/lib/db/connection-url.ts ./src/lib/db/connection-url.ts
COPY --from=builder /app/src/lib/env ./src/lib/env
COPY --from=builder /app/scripts/start-production.mjs ./scripts/start-production.mjs
COPY --from=builder /app/scripts/load-env-file.mjs ./scripts/load-env-file.mjs
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

USER nextjs
EXPOSE 3000

CMD ["node", "scripts/start-production.mjs"]
