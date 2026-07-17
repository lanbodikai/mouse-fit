# Architecture

## Repository Layout

### Frontend

- `frontend/src/app/`
  Route entrypoints only. Large route implementations were moved into `features/`.
- `frontend/src/features/catalog/`
  Mouse catalog page, extracted catalog UI components, and catalog-specific helpers/types.
- `frontend/src/features/database/`
  Legacy database view implementation moved out of the shared components root.
- `frontend/src/features/studio/measure/`
  Measure tool route implementation.
- `frontend/src/features/studio/grip/`
  Grip tool route implementation.
- `frontend/src/features/survey/`
  Survey flow implementation.
- `frontend/src/components/`
  Shared app-level components and compatibility re-exports for moved feature screens.
- `frontend/src/services/api/`
  API client and request helpers.
- `frontend/src/types/`
  Shared frontend API/domain types.

### Backend

- `backend/main.py`
  Thin bootstrap entrypoint for `uvicorn main:app`.
- `backend/backend/app.py`
  Central FastAPI app creation, middleware registration, CORS, and router wiring.
- `backend/backend/routes/`
  Route definitions only.
- `backend/backend/controllers/`
  Request handlers that translate HTTP requests into service calls and response models.
- `backend/backend/services/`
  Business logic, orchestration, report generation, and startup bootstrapping.
- `backend/backend/repositories/`
  Database access modules.
- `backend/backend/db/`
  Connection pool, schema bootstrapping, row mapping, and seed loading.
- `backend/backend/middleware/`
  Request context/auth middleware and global error handlers.
- `backend/backend/schemas/`
  Pydantic request/response models.
- `backend/backend/utils/`
  Shared serialization, normalization, and timestamp helpers.

## Backend Request Flow

1. Route modules in `backend/backend/routes/` receive the HTTP request.
2. `backend/backend/middleware/request_context.py` attaches request ID, parses bearer tokens, and stores auth/session context on `request.state`.
3. Route handlers delegate to controllers in `backend/backend/controllers/`.
4. Controllers validate request context, translate HTTP concerns, and call services.
5. Services implement business logic and call repositories.
6. Repositories perform SQL queries through `backend/backend/db/pool.py`.
7. Controllers return response models; middleware/error handlers wrap failures into consistent envelopes.

## Key Flows

### Session/Auth

- Bearer tokens are parsed and verified in `backend/backend/middleware/request_context.py`.
- Auth claims are stored on `request.state`.
- Protected controllers call `require_authenticated_user(...)` from the same module.
- Profile seed data such as display name and avatar URL is derived once in the request middleware layer and reused by controllers/services.

### Database

- Connection pool lifecycle is managed in `backend/backend/db/pool.py`.
- Schema initialization lives in `backend/backend/db/schema.py`.
- JSON seed loading for mice lives in `backend/backend/db/seed.py`.
- Row-to-model mapping for mice lives in `backend/backend/db/mappers.py`.

### Health Check

- `GET /api/health` and `GET /api/metrics` are defined in `backend/backend/routes/health.py`.
- Their controller lives in `backend/backend/controllers/health_controller.py`.

## Notes

- `backend/backend/api/routes_rag.py` is still the legacy RAG/chat route module. It is now mounted through the centralized app/router setup, but it remains the main backend area that would benefit from a deeper second-pass split if you want the RAG path to fully match the new controller/service layout.
