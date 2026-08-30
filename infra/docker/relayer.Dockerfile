# Relayer image.
#
# Multi-stage, so the runtime layer carries no compiler and no dev dependencies.
# The build stage installs the WHOLE workspace, because the relayer imports
# @vouch/proof-engine and @vouch/attestcoin through npm workspace links and a
# per-package install cannot resolve them.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/proof-engine/package.json packages/proof-engine/
COPY packages/attestcoin/package.json packages/attestcoin/
COPY packages/config/package.json packages/config/
COPY packages/schemas/package.json packages/schemas/
COPY services/relayer/package.json services/relayer/
RUN npm ci --no-audit --no-fund

COPY packages/ packages/
COPY services/relayer/ services/relayer/

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Unprivileged. The relayer key pays gas and grants no authority, but a process
# that does not need root should not have it.
RUN addgroup -S vouch && adduser -S vouch -G vouch
COPY --from=build --chown=vouch:vouch /app /app
USER vouch

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--experimental-strip-types", "services/relayer/src/index.ts"]
