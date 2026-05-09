# Multi-stage build for the health service.
#
# Stage 1 (deps): Node 24 bookworm-slim with the node-gyp toolchain so that
# better-sqlite3 can compile if a prebuilt binary isn't available for the
# target architecture.
#
# Stage 2 (runtime): Slim image with just node_modules + source. The server
# runs from TypeScript source via `node --experimental-strip-types` — no
# separate compile step.

ARG NODE_VERSION=24
ARG PNPM_VERSION=10.28.0

# ---------- deps stage ----------
FROM node:${NODE_VERSION}-bookworm-slim AS deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy workspace manifests first for better layer caching — install only
# re-runs when manifests change, not on every source edit.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile

# ---------- runtime stage ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV HEALTH_DB_DIALECT=sqlite
ENV HEALTH_DB_FILENAME=/data/health.db

# pnpm preserves a symlinked node_modules tree (root-level + per-workspace),
# both halves are needed for resolution at runtime.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY package.json pnpm-workspace.yaml tsconfig.json ./
COPY apps/server/package.json apps/server/tsconfig.json ./apps/server/
COPY apps/server/src ./apps/server/src

RUN useradd --system --uid 1001 --no-create-home --home /app health \
    && mkdir -p /data \
    && chown -R health:health /app /data

USER health

VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--experimental-strip-types", "apps/server/src/server.ts"]
