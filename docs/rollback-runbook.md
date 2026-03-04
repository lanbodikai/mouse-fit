# MouseFit Rollback Runbook

## Trigger Conditions
- Elevated 5xx error rate after deploy.
- Report generation failures exceed acceptable threshold.
- Auth failures block legitimate users.
- Severe latency regression on `/api/chat` or `/api/report/generate`.

## Immediate Steps
1. Disable feature flags:
   - `NEXT_PUBLIC_USE_SERVER_REPORT_PIPELINE=0`
   - `ENABLE_AUTH=0` and `NEXT_PUBLIC_ENABLE_AUTH=0` if auth is root cause
2. Redeploy frontend and backend with safe flags.
3. Validate `/api/health` and key guest flow.
4. Confirm deprecated RAG endpoints return `410`:
   - `/api/rag/query`, `/api/candidates`, `/api/rerank`, `/api/report`

## If Service Is Still Unhealthy
1. Roll back container image to last known good release.
2. Keep database at current migration head (do not destructive downgrade in incident path).
3. Re-verify:
   - `/api/mice`
   - Measure -> Grip -> Report
   - `/api/chat` if enabled
   - Deprecated RAG endpoints still return `410`

## Data Safety Notes
- New schema additions are backward-compatible (`user_id` nullable).
- Existing guest records remain valid (`user_id IS NULL`).
- Avoid manual deletes during incident response.

## Post-Incident
1. Gather request IDs from failing calls.
2. Export metrics snapshot from `/api/metrics`.
3. Create incident timeline and corrective actions.
