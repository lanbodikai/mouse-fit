# MouseFit

MouseFit v2 is a small full-stack app:

- `frontend/`: Next.js UI
- `backend/`: FastAPI API server

## Local dev

Run API:

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
alembic -c alembic.ini upgrade head
uvicorn main:app --reload --port 8000
```

Run UI (in another terminal):

```bash
cd frontend
npm install
set NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
```

Open `http://localhost:3000`.

## Reference docs

- `api-contract-v1.md`
- `migrations.md`
- `monitoring.md`
- `staging-rollout-checklist.md`
- `rollback-runbook.md`
- `branch-protection.md`

