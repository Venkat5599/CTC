# Indexer image.
#
# Same shape as the relayer, plus a Prisma generate step. The client is generated
# code, so nothing importing it runs until it exists; generating at build time
# rather than on first boot keeps that failure out of production.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/config/package.json packages/config/
COPY packages/schemas/package.json packages/schemas/
COPY services/indexer/package.json services/indexer/
RUN npm ci --no-audit --no-fund

COPY packages/ packages/
COPY services/indexer/ services/indexer/
RUN npm --prefix services/indexer run db:generate

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S vouch && adduser -S vouch -G vouch
COPY --from=build --chown=vouch:vouch /app /app
USER vouch

EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:8081/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--experimental-strip-types", "services/indexer/src/index.ts"]
