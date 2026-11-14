# ==============================================================================
# Production Dockerfile for Mobile Vendor App (Backend API + Frontend SPA)
# Unified single-container deployment compatible with Google Cloud Run & Docker Compose
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# ------------------------------------------------------------------------------
FROM node:24-bookworm-slim AS frontend-builder
WORKDIR /build/app

# Install frontend dependencies
COPY app/package.json app/package-lock.json ./
RUN npm ci

# Copy frontend source
COPY app ./

# Build arguments for Vite static bundling
ARG VITE_GOOGLE_API_KEY
ARG VITE_API_URL=/api
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Backend Base (API, Prisma & Migrations)
# ------------------------------------------------------------------------------
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

# Cloud Run injects PORT (defaults to 8080).
# On Cloud Run, RUN_MIGRATIONS should be false for web services (run via Cloud Run Job instead)
ENV NODE_ENV=production
ENV PORT=8080
ENV RUN_MIGRATIONS=false
EXPOSE 8080

# Health check compatible with dynamic PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e 'fetch("http://localhost:" + (process.env.PORT || 8080) + "/health").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "api/index.js"]

# ------------------------------------------------------------------------------
# Stage 3: Unified Production Container (Default target for Cloud Run)
# ------------------------------------------------------------------------------
FROM backend AS production

# Copy built frontend assets from Stage 1 into /app/app/dist
COPY --from=frontend-builder /build/app/dist ./app/dist
