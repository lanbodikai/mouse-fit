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

## Docker Compose shared env download

`docker-compose.yml` now passes `MOUSEFIT_ENV_URL` into both image builds. By default it points to:

`https://raw.githubusercontent.com/lanbodikai/mouse-fit/main/.env.compose`

During `docker compose build`, each Dockerfile tries to download that file and store it in the image as `/app/.mousefit.env`. On container startup, that file is sourced automatically.

The `.env.compose` file is the unified env inventory for this repo (backend, frontend, and script vars).
Its SMTP entries are placeholders by design. Set real `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `CONTACT_TO` via your local/deploy env source instead of committing secrets.

### Typical flow

```bash
docker compose build
docker compose up -d
```

### Use your own env URL

```bash
set MOUSEFIT_ENV_URL=https://your-host/path/to/.env
docker compose build
```

If env download fails, build continues and services fall back to compose/runtime env values.

`MOUSEFIT_ENV_URL` is listed in `.env.compose` for completeness, but compose resolves it from your current shell/local compose env before the image download step.
