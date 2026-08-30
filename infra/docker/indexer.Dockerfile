# Indexer image.
#
# Multi-stage, so the runtime layer carries no compiler and no dev dependencies.
#
# The build stage copies EVERY workspace manifest before installing, not just
# the relayer's. `npm ci` validates the lockfile against the full workspace
# graph, so a missing package.json anywhere fails the install with an error
# about a package the relayer never imports. Copying manifests first and source
# second is also what keeps the dependency layer cached across source changes.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Manifests only. Adding a workspace means adding a line here.
COPY packages/attestcoin/package.json packages/attestcoin/
COPY packages/config/package.json packages/config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/proof-engine/package.json packages/proof-engine/
COPY packages/schemas/package.json packages/schemas/
COPY packages/sdk/package.json packages/sdk/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/ui/package.json packages/ui/
COPY services/indexer/package.json services/indexer/
COPY services/relayer/package.json services/relayer/
COPY services/worker/package.json services/worker/
COPY apps/web/package.json apps/web/
COPY apps/explorer/package.json apps/explorer/
COPY apps/docs/package.json apps/docs/
COPY apps/demo-credit/package.json apps/demo-credit/
COPY tests/integration/package.json tests/integration/

# The frontends are not needed to run a relayer and pull in the heaviest tree
# in the repo, so they are excluded from the install rather than the copy.
RUN npm ci --no-audit --no-fund --omit=optional       --workspace=@vouch/relayer       --workspace=@vouch/proof-engine       --workspace=@vouch/attestcoin       --workspace=@vouch/config       --workspace=@vouch/schemas       --include-workspace-root

COPY packages/ packages/
COPY services/relayer/ services/relayer/

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Unprivileged. The indexer holds no key at all; it only reads.
RUN addgroup -S vouch && adduser -S vouch -G vouch
COPY --from=build --chown=vouch:vouch /app /app
USER vouch

EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3   CMD node -e "fetch('http://localhost:8081/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--experimental-strip-types", "services/indexer/src/serve.ts"]
