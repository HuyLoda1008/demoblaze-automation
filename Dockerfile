# Matches the @playwright/test version pinned in package.json -- the
# browsers baked into this image must match the npm package version or
# `npx playwright test` refuses to run.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json playwright.config.ts ./
COPY config ./config
COPY src ./src
COPY tests ./tests

# No CMD default tag -- the k8s CronJob manifests (see k8s/) set `args` per
# environment (@smoke on a tight schedule, @regression nightly, etc.), so
# forcing a default here would silently mask a missing args block instead
# of failing loudly.
ENTRYPOINT ["npx", "playwright", "test"]
