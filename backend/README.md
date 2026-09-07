# MouseFit Backend

The MouseFit backend is a FastAPI service responsible for persistence, catalog APIs, recommendation reports, auth-aware profile data, and AI-assisted mouse matching.

## Stack

- FastAPI and Uvicorn
- PostgreSQL with psycopg and connection pooling
- Alembic migrations
- Pydantic models
- Optional Supabase JWT verification
- Optional Sentry telemetry
- Optional Groq-backed catalog chat/RAG support

## Main API Areas

- `GET /api/health` - service health
- `GET /api/ready` - PostgreSQL-backed readiness check
- `GET /api/metrics` - basic service metrics
- `GET /api/profile/me` and `POST /api/profile/me` - profile data
- `GET /api/me` - current user state
- `POST /api/survey/complete` and `POST /api/survey/dismiss` - survey state
- `GET /api/mice` and `GET /api/mice/{mouse_id}` - mouse catalog
- `POST /api/measurements` - save hand measurements
- `POST /api/grip` - save grip classification
- `POST /api/report/generate` - generate recommendations
- `GET /api/report/latest` - fetch the latest stored report

Additional AI and RAG routes are mounted from `backend/api/routes_rag.py`.

## Local Setup

Install dependencies:

```bash
pip install -r requirements.txt
```

Set a database URL:

```powershell
$env:DATABASE_URL = "postgresql://mousefit:mousefit@localhost:5432/mousefit"
```

Run migrations:

```bash
alembic -c alembic.ini upgrade head
```

Start the API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Docker

From the repository root:

```bash
docker compose up --build backend
```

The backend container runs Alembic migrations before starting Uvicorn.

## Environment

- `DATABASE_URL` - required PostgreSQL connection string
- `WEB_CONCURRENCY` - number of Uvicorn workers in Docker
- `MOUSEFIT_WARMUP_RAG` - optional RAG warmup toggle
- `MOUSEFIT_AUTO_SCHEMA_INIT` - optional schema initialization toggle
- `ENABLE_AUTH` - enables backend auth behavior
- `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_AUDIENCE` - Supabase/JWT settings
- `GROQ_API_KEY` - optional AI chat/catalog support
- `SENTRY_DSN` and `SENTRY_TRACES_SAMPLE_RATE` - optional telemetry
- `REDIS_URL` - optional shared rate-limit store for multi-worker deployments
- `MOUSEFIT_DB_POOL_MIN_SIZE` / `MOUSEFIT_DB_POOL_MAX_SIZE` - per-worker PostgreSQL pool sizing
- `MOUSEFIT_WARMUP_RAG` - build/load the RAG index during startup instead of the first request

## Tests

```bash
pytest
```
