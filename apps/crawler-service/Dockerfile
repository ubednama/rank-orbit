# crawler-service — Fastify + Puppeteer + Lighthouse
# Target: Fly.io (or any container host with ≥ 1GB RAM; Chromium is fat)
# Build context: REPO ROOT
#
# Note: Puppeteer ships its own Chromium download. We rely on that rather than
# installing Chromium via apt to keep versions matched to puppeteer's expectations.

FROM node:24-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

# Puppeteer's bundled Chromium needs these system libs at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 \
    libgcc-s1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
    libxss1 libxtst6 lsb-release wget xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/crawler-service/package.json apps/crawler-service/
COPY apps/api-gateway/package.json apps/api-gateway/
COPY apps/client/package.json apps/client/
COPY apps/ai-service/pyproject.toml apps/ai-service/
COPY libs/db/package.json libs/db/
# libs/shared/types and libs/shared/utils have NO package.json — they're
# webpack path aliases bundled inline at build time, not pnpm packages.

# Install ALL workspace deps. Filtering causes webpack to fail resolving deps
# from libs/* that get bundled inline (same issue as api-gateway). Puppeteer's
# postinstall runs and pulls Chromium during this step.
RUN pnpm install --frozen-lockfile

# ---- Build stage ----
FROM deps AS build
COPY tsconfig.base.json ./
COPY libs/ ./libs/
COPY apps/crawler-service/ ./apps/crawler-service/
WORKDIR /repo/apps/crawler-service
RUN pnpm exec webpack --config webpack.config.js --mode production

# ---- Runtime stage ----
FROM node:24-slim AS runtime

# Re-install the Chromium runtime libs (the deps stage's apt cache is gone)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 \
    libgcc-s1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
    libxss1 libxtst6 lsb-release wget xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Preserve /repo path so pnpm's symlink tree stays valid AND main.js lives
# next to its node_modules so Node resolves modules correctly. Same fix
# pattern as api-gateway. Plus assets need to be at the cwd-relative path
# the lighthouse worker spawn expects.
WORKDIR /repo

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/crawler-service/node_modules ./apps/crawler-service/node_modules
COPY --from=build /repo/apps/crawler-service/package.json ./apps/crawler-service/
COPY --from=build /repo/dist/apps/crawler-service/main.js ./apps/crawler-service/main.js
# The lighthouse worker is a separate Node subprocess. Its `import lighthouse`
# resolves modules from the worker's directory upward — which means the worker
# MUST live inside apps/crawler-service/ where the pnpm symlink to lighthouse
# is reachable. Putting it under dist/ would dangle (no node_modules walk path).
COPY --from=build /repo/dist/apps/crawler-service/assets ./apps/crawler-service/assets
# Puppeteer downloads Chromium to ~/.cache/puppeteer during install
COPY --from=build /root/.cache/puppeteer /root/.cache/puppeteer

# WORKDIR=/repo so process.cwd() satisfies the lighthouse worker path lookup.
# main.js's location (/repo/apps/crawler-service/main.js) is what governs
# Node's module resolution, NOT cwd.
WORKDIR /repo

ENV NODE_ENV=production
ENV PUPPETEER_HEADLESS=true
EXPOSE 3001

CMD ["node", "apps/crawler-service/main.js"]
