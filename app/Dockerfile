# ==============================================================================
# Multi-stage Dockerfile for Mobile Vendor Frontend (Vite + React + Nginx)
# Compatible with Google Cloud Run & Docker Compose
# ==============================================================================

# Stage 1: Build production bundle
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY . ./

# Vite evaluates environment variables at BUILD time
ARG VITE_GOOGLE_API_KEY
ARG VITE_API_URL=/api
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve statically via Nginx
FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html

# Clear standard default static assets
RUN rm -rf ./*

# Copy built assets
COPY --from=builder /app/dist .

# Copy Nginx template for dynamic runtime configuration ($PORT and $API_BACKEND_URL)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Cloud Run defaults to 8080.
# NGINX_ENVSUBST_FILTER ensures envsubst ONLY replaces ${PORT} and ${API_BACKEND_URL},
# preventing corruption of internal Nginx variables like $uri and $http_upgrade.
ENV PORT=8080
ENV API_BACKEND_URL=http://api:8080
ENV NGINX_ENVSUBST_FILTER='PORT|API_BACKEND_URL'
EXPOSE 8080

# Health check compatible with dynamic PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:${PORT:-8080}/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
