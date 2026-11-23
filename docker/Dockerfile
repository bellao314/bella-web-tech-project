# ==============================================================================
# Production Dockerfile for Mobile Vendor Backend API & Database Migrations
# Compatible with Docker Compose
# ==============================================================================
FROM node:24-bookworm-slim AS backend

# Install necessary system libraries for native modules and SSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root and API package manifests for layer caching
COPY package.json package-lock.json ./
COPY api/package.json api/package-lock.json ./api/

# Install workspace and backend dependencies
RUN npm ci && cd api && npm ci

# Copy database schema, migrations, config and API source code
COPY prisma.config.ts ./
COPY migrations ./migrations
COPY api ./api

# Copy and configure entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV RUN_MIGRATIONS=true
EXPOSE 8080

# Health check compatible with dynamic PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e 'fetch("http://localhost:" + (process.env.PORT || 8080) + "/health").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "api/index.js"]
