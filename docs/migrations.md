# Database Migrations

Alembic is the source of truth for schema changes.

## Local
1. Export `DATABASE_URL`.
2. Run:
   - `cd backend`
   - `alembic -c alembic.ini upgrade head`

## Docker
- Backend container runs migrations on startup:
  - `alembic -c alembic.ini upgrade head`

## Notes
- `MOUSEFIT_AUTO_SCHEMA_INIT` defaults to `0` and should remain off in production.
- Existing guest data remains valid (`user_id IS NULL`).
