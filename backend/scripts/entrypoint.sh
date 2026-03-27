#!/bin/sh
# Entrypoint: backup → migrate → serve
set -e

# ── 1. Pre-migration database backup ──────────────────────────────────────────
# Extract host/port from DATABASE_URL
# Format: postgresql+asyncpg://user:password@host:port/dbname
DB_URL="${DATABASE_URL:-}"
DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_USER=$(echo "$DB_URL" | sed -E 's|.*://([^:]+):.*|\1|')
DB_PASS=$(echo "$DB_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre_migration_${TIMESTAMP}.sql"

if [ -d "$BACKUP_DIR" ] && command -v pg_dump > /dev/null 2>&1; then
  echo "[entrypoint] Checking if database has data to back up..."
  TABLE_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null | tr -d ' ' || echo "0")

  if [ "$TABLE_COUNT" -gt "0" ]; then
    echo "[entrypoint] Backing up database to $BACKUP_FILE ..."
    PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
    echo "[entrypoint] Backup complete ($(du -sh "$BACKUP_FILE" | cut -f1))."

    # Keep only the 10 most recent backups
    ls -t "$BACKUP_DIR"/pre_migration_*.sql 2>/dev/null | tail -n +11 | xargs -r rm --
    echo "[entrypoint] Old backups pruned (keeping last 10)."
  else
    echo "[entrypoint] Database is empty — skipping backup."
  fi
else
  echo "[entrypoint] Backup skipped (no backup dir or pg_dump not available)."
fi

# ── 2. Run Alembic migrations ──────────────────────────────────────────────────
echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head

# ── 3. Seed base data ──────────────────────────────────────────────────────────
echo "[entrypoint] Seeding base data..."
python -m app.seed

# ── 4. Start application ───────────────────────────────────────────────────────
echo "[entrypoint] Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
