# MouseFit API Contract v1

## Base
- Local: `http://localhost:8000`
- Production: `https://api.mousefit.pro`

## Conventions
- Request tracing:
  - Request header: `X-Request-ID` (optional)
  - Response header: `X-Request-ID` (always returned)
- Auth:
  - Optional bearer token: `Authorization: Bearer <supabase_access_token>`
  - If valid and auth enabled, writes are tagged with `user_id`.
- Error envelope:
```json
{
  "code": "string_code",
  "message": "Human-readable message",
  "request_id": "uuid-or-client-value",
  "detail": {}
}
```

## Canonical Routes

### `GET /api/health`
- Returns API liveness and request ID.

### `GET /api/metrics`
- Returns in-memory request counters and latency aggregates.

### `GET /api/mice`
- Returns full normalized mouse dataset.

### `GET /api/mice/{mouse_id}`
- Returns one mouse by ID.

### `POST /api/measurements`
Body:
```json
{
  "session_id": "string",
  "length_mm": 190.1,
  "width_mm": 95.4
}
```

### `POST /api/grip`
Body:
```json
{
  "session_id": "string",
  "grip": "palm|claw|fingertip",
  "confidence": 0.9
}
```

### `POST /api/report/generate?session_id=<id>`
- Generates and persists latest report for session/user.

### `GET /api/report/latest?session_id=<id>`
- Returns latest persisted report for session/user.

### `POST /api/chat`
Body:
```json
{
  "messages": [
    {"role": "user", "content": "I have 19x10 hands, claw grip, budget $100"}
  ],
  "model": "optional",
  "temperature": 0.5
}
```

## Deprecated
- `POST /api/agent/chat` now returns `410 Gone` with migration message to `/api/chat`.
- `POST /api/rag/query` now returns `410 Gone`.
- `POST /api/candidates` now returns `410 Gone`.
- `POST /api/rerank` now returns `410 Gone`.
- `POST /api/report` now returns `410 Gone`.

## Rate Limits
- `POST /api/chat`: 20 requests / 60s per user or IP
- Frontend contact route (`/api/contact`): 5 requests / 60s per IP
