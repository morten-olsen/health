FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN apk add --no-cache libc6-compat

# --- Prune the monorepo to only what @morten-olsen/health-api needs ---
FROM base AS prune
WORKDIR /app
RUN npm i -g turbo@2
COPY . .
RUN turbo prune @morten-olsen/health-api --docker

# --- Install dependencies from the pruned lockfile ---
FROM base AS deps
WORKDIR /app
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS build
COPY --from=prune /app/out/full/ .
RUN pnpm turbo build --filter=@morten-olsen/health-api

# --- Production runtime ---
FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

COPY --from=deps /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=deps /app/packages/contracts/package.json ./packages/contracts/
COPY --from=deps /app/packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/packages/api/dist ./packages/api/dist

ENV NODE_ENV=production
EXPOSE 3007
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3007/healthz || exit 1
CMD ["node", "packages/api/dist/main.js"]
