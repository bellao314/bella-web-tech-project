# ==============================================================================
# Standalone Dockerfile for Mobile Vendor Backend API
# Compatible with Google Cloud Run & Docker Compose
# ==============================================================================
FROM node:24-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Health check compatible with dynamic PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e 'fetch("http://localhost:" + (process.env.PORT || 8080) + "/health").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

CMD ["node", "index.js"]
