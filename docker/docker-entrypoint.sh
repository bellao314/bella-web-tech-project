#!/bin/sh
set -e

# If DATABASE_URL is set, wait for PostgreSQL to become reachable
if [ -n "$DATABASE_URL" ]; then
  echo "Checking database connection..."
  MAX_RETRIES=${DB_MAX_RETRIES:-30}
  COUNT=0
  until node --input-type=module -e '
    const url = process.env.DATABASE_URL;
    if (!url) process.exit(0);
    const { Client } = await import("pg");
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      await client.end();
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  ' 2>/dev/null || [ "$COUNT" -ge "$MAX_RETRIES" ]; do
    COUNT=$((COUNT + 1))
    echo "Waiting for database to be ready (attempt $COUNT/$MAX_RETRIES)..."
    sleep 2
  done

  if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
    echo "Warning: Database did not become ready within timeout. Proceeding anyway..."
  else
    echo "Database is ready and reachable."
  fi
fi

# Run migrations if enabled (default: true)
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  npx prisma db migrate --yes || echo "Warning: prisma db migrate encountered an issue; proceeding."
fi

# Seed database if requested (default: false)
if [ "${SEED_DATABASE:-false}" = "true" ]; then
  echo "Running database seed..."
  npm run seed || echo "Warning: database seed encountered an issue; proceeding."
fi

echo "Starting application: $@"
exec "$@"
