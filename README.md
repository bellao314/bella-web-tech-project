# Finnley: A Mobile Vendor Finder

[![codecov](https://codecov.io/gh/bellao314/bella-web-tech-project/graph/badge.svg?token=GESZTPGVMW)](https://codecov.io/gh/bellao314/bella-web-tech-project)

A web application for discovering and connecting with local mobile vendors, food trucks, and pop-up makers.

## Quick Start

### 1. Prerequisites
- Node.js
- PostgreSQL database environment

### 2. Configure Environment Variables
For Backend:
```
# /api/.env.example

# Database Configuration (PostgreSQL)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=mobile_vendor
POSTGRES_PORT=5432

# Backend API Configuration
PORT=3000
API_PORT=3000
JWT_SECRET=secret_jwt_salt
BASE_URL=http://localhost:5173

# Database connection URL for API (formatted automatically in docker-compose)
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/mobile_vendor

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

For Frontend:
```
# /app/.env.example

# Google Maps API Key
VITE_GOOGLE_API_KEY=your_google_maps_api_key_here

# Frontend Configuration
FRONTEND_PORT=80
VITE_API_URL=/api
```

### 3. Install Dependencies
In root directory:
```
npm ci
```

In /api:
```
npm ci
```

In /app:
```
npm ci
```

### 4. Database Setup
Make sure your PostgreSQL instance is running and your `DATABASE_URL` is configured in `api/.env`.

In `/api` folder (or from the project root):
```bash
# 1. Emit Prisma contract artifacts (contract.json and contract.d.ts)
npx prisma contract emit

# 2. Apply Prisma contract migrations to the database
npx prisma db migrate

# 3. Seed the database with initial vendor and user data
npm run seed
```

### 5. Run Backend and Frontend
On one terminal instance:
```
cd api
npm run dev
```

On another terminal instance:
```
cd app
npm run dev
```

- **Frontend (Web):** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3000](http://localhost:3000)


