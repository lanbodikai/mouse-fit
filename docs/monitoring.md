# Monitoring Baseline

## API Metrics
- Endpoint: `GET /api/metrics`
- Captures:
  - total requests
  - per route/method/status count
  - average latency (ms)
  - max latency (ms)

## Request Correlation
- Every response includes `X-Request-ID`.
- Error bodies include `request_id`.

## Alert Suggestions
- 5xx rate > 2% for 5 minutes.
- `/api/report/generate` p95 latency > 1500ms.
- `/api/chat` p95 latency > 4000ms.
- Sudden spike in `rate_limited` errors.
- Unexpected sustained traffic on deprecated endpoints (`/api/rag/query`, `/api/candidates`, `/api/rerank`, `/api/report`).

## Error Tracking
- Backend Sentry is enabled when `SENTRY_DSN` is set.
- Frontend Sentry is enabled when `NEXT_PUBLIC_SENTRY_DSN` is set.
