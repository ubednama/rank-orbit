# api-gateway — Express + Drizzle + BullMQ
# Target: Fly.io (any region; pick closest to your Supabase region for low DB latency)
# Build context: REPO ROOT (so we can access pnpm workspace lockfile + libs/)
#
# fly.toml in this directory should set:
#   build.dockerfile = "apps/api-gateway/Dockerfile"
#   build.dockerfile-context = "../../"  (or set the build context manually)

FROM node:24-slim AS deps

# pnpm — use the version pinned in package.json
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

WORKDIR /repo

# Copy workspace manifest + lockfile + ALL workspace package.json files so pnpm
# can resolve the monorepo. Avoids invalidating cache on unrelated source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-gateway/package.json apps/api-gateway/
COPY apps/client/package.json apps/client/
COPY apps/crawler-service/package.json apps/crawler-service/
COPY apps/ai-service/pyproject.toml apps/ai-service/
COPY libs/db/package.json libs/db/
# libs/shared/types and libs/shared/utils have NO package.json — they're
# webpack path aliases (@shared/types, @shared/utils) bundled inline at
# build time, not pnpm packages. Don't COPY their package.json.

# Install ALL workspace deps. Earlier we used `--filter "@rank-orbit/api-gateway..."`
# to install just api-gateway's deps, but webpack bundles libs/db inline (via the
# @db alias) and libs/db imports `postgres`/`drizzle-orm` from its own deps. Without
# those installed, webpack fails with "Can't resolve 'postgres'". Installing
# everything is ~50MB more in the deps stage but never bites again.
RUN pnpm install --frozen-lockfile

# ---- Build stage ----
FROM deps AS build
COPY tsconfig.base.json ./
COPY libs/ ./libs/
COPY apps/api-gateway/ ./apps/api-gateway/
WORKDIR /repo/apps/api-gateway
RUN pnpm exec webpack --config webpack.config.js --mode production

# ---- Runtime stage ----
FROM node:24-slim AS runtime

WORKDIR /app

# Bundled main.js + the workspace node_modules tree (webpack externalizes deps)
COPY --from=build /repo/dist/apps/api-gateway/main.js ./main.js
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api-gateway/node_modules ./apps/api-gateway/node_modules
COPY --from=build /repo/libs ./libs
COPY --from=build /repo/apps/api-gateway/package.json ./apps/api-gateway/

ENV NODE_ENV=production
EXPOSE 3333

CMD ["node", "main.js"]
