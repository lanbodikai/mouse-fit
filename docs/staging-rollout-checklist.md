# MouseFit Staging Rollout Checklist

## Pre-Deploy
- Confirm `DATABASE_URL` points to staging database.
- Set `ENABLE_AUTH=1` only if Supabase staging keys are configured.
- Set `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_AUDIENCE`.
- Set `NEXT_PUBLIC_ENABLE_AUTH=1` and frontend Supabase public env values.
- In Supabase Auth URL settings and Google provider config, allow `/auth/callback` for staging domain.
- Ensure `NEXT_PUBLIC_USE_SERVER_REPORT_PIPELINE=0` unless explicitly validating server report fallback.

## Database
- Run migration:
  - `alembic -c backend/alembic.ini upgrade head`
- Verify schema:
  - `measurements.user_id`, `grips.user_id`, `reports.user_id`
  - `profiles` table exists

## App Validation
- `GET /api/health` returns `ok=true`.
- `GET /api/mice` returns non-empty array.
- Guest flow works end-to-end:
  - Measure -> Grip -> Report.
- Auth flow works:
  - Email sign-in auto-creates account when missing.
  - Google OAuth returns to `/auth/callback` and lands on dashboard.
  - Sign in, generate report, refresh, latest report still available.
- AI chat works via `/api/chat`.
- Deprecated route check:
  - `POST /api/agent/chat` returns 410.
  - `POST /api/rag/query` returns 410.
  - `POST /api/candidates` returns 410.
  - `POST /api/rerank` returns 410.
  - `POST /api/report` returns 410.

## Manual QA Scenarios (Matcher + Chat Rerank)
- Flow A: claw + medium hand + inward thumb + budget filter.
- Flow B: fingertip + small hand + low budget.
- Flow C: palm + large hand + strict feature filters causing fallback.
- Flow D: force chat failure (network or malformed reply) and confirm deterministic local ranking fallback.

## Security Validation
- Invalid bearer token returns 401 error envelope.
- CORS preflight works from allowed origins only.
- Rate limiting returns 429 at thresholds.

## Observability
- Check `GET /api/metrics` for traffic and latency snapshots.
- Confirm `X-Request-ID` in responses.
- If `SENTRY_DSN` set, verify errors appear in Sentry.
