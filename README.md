# Mobile Vendor Finder

[![codecov](https://codecov.io/gh/bellao314/bella-web-tech-project/graph/badge.svg?token=GESZTPGVMW)](https://codecov.io/gh/bellao314/bella-web-tech-project)

A web application for discovering and connecting with local mobile vendors, food trucks, and pop-up makers.

## Docker Deployment & Quick Start

### 1. Prerequisites
- Docker Engine 20.10+ (or Docker Desktop)
- Docker Compose v2+

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_API_KEY` are populated.

### 3. Production Deployment
Start the PostgreSQL database, Express API, and Nginx-powered React frontend:
```bash
docker compose up --build -d
```

- **Frontend (Web):** [http://localhost](http://localhost) (or port configured in `.env`)
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **Health Check:** [http://localhost/health](http://localhost/health)

The API service runs database migrations automatically on startup via `prisma db migrate`. To seed the database with initial vendor data, set `SEED_DATABASE=true` in `.env` or run:
```bash
docker compose exec api npm run seed
```

To stop all containers:
```bash
docker compose down
```

To stop containers and wipe persistent database volumes:
```bash
docker compose down -v
```

### 4. Development Workflow (Hot-Reloading)
For live code reloads on both backend and frontend without rebuilding images:
```bash
docker compose -f docker-compose.dev.yml up
```
- **Vite Dev Server:** [http://localhost:5173](http://localhost:5173)
- **API Dev Server (Nodemon):** [http://localhost:3000](http://localhost:3000)

### 5. Google Cloud Run Deployment
The root `Dockerfile` is configured as a multi-stage unified production image that builds the React frontend and serves both the static web application and the Express API under a single Cloud Run service:

```bash
gcloud run deploy mobile-vendor-app \
  --source . \
  --region <your-region> \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="<db-connection-string>",JWT_SECRET="<jwt-secret>" \
  --set-build-env-vars VITE_GOOGLE_API_KEY="<maps-api-key>"
```

- When deployed, the root URL (`GET /`) and client-side routes serve the React Single Page Application.
- API endpoints are accessed at `/api/*`.
- Health check is available at `/health`.

