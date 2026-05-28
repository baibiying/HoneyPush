# Self-hosted production (China/HK VPS). Users access your server IP/domain — no Vercel VPN.
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]
