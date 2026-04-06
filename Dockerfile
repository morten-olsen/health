ARG PACKAGE
ARG ENTRYPOINT

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN apk add --no-cache libc6-compat

# --- Prune the monorepo to only what the target package needs ---
FROM base AS prune
ARG PACKAGE
WORKDIR /app
RUN npm i -g turbo@2
COPY . .
RUN turbo prune "${PACKAGE}" --docker

# --- Install dependencies from the pruned lockfile ---
FROM base AS deps
WORKDIR /app
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS build
ARG PACKAGE
COPY --from=prune /app/out/full/ .
RUN pnpm turbo build --filter="${PACKAGE}"

# --- Production runtime ---
FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/ ./packages/

ARG ENTRYPOINT
ENV NODE_ENV=production
ENV ENTRYPOINT=${ENTRYPOINT}
CMD ["sh", "-c", "node ${ENTRYPOINT}"]
