.PHONY: up down build logs migrate migration seed reset-db dev test test-local check-frontend deploy backup clean

# ── Production ───────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

deploy:
	git pull origin $(shell git branch --show-current)
	docker compose build
	docker compose up -d
	@echo "Waiting for health check..."
	@for i in $$(seq 1 30); do \
		curl -sf http://localhost:8000/health > /dev/null 2>&1 && echo "Healthy!" && break; \
		sleep 2; \
	done

# ── Development ──────────────────────────────────────────
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# ── Database ─────────────────────────────────────────────
migrate:
	docker compose exec backend alembic upgrade head

migration:
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"

seed:
	docker compose exec backend python -m app.seed

reset-db:
	docker compose down -v
	docker compose up -d db
	@echo "Waiting for database to be ready..."
	@sleep 3
	docker compose exec backend alembic upgrade head

# ── Testing ──────────────────────────────────────────────
test:
	docker compose exec backend pytest -v

test-local:
	cd backend && python -m pytest -v

check-frontend:
	cd frontend && npx tsc --noEmit

# ── Utilities ────────────────────────────────────────────
backup:
	docker compose exec db pg_dump -U postgres budget > backups/manual_$$(date +%Y%m%d_%H%M%S).sql

clean:
	docker image prune -f
	docker builder prune -f
