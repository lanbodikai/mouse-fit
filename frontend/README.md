# MouseFit Frontend

The MouseFit frontend is a Next.js app that provides the public site, auth flows, dashboard shell, mouse fitting tools, and recommendation report experience. It connects to the FastAPI backend for mouse catalog data, measurements, grip results, generated reports, user profile state, and AI-assisted matching.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React icons
- Sentry browser/server instrumentation
- Supabase-compatible auth configuration

## Main Areas

- `src/app/(landing)` - landing, services, and about pages
- `src/app/(shell)` - authenticated dashboard and tool workspaces
- `src/app/auth` - sign in, sign up, callback, verification, and password reset
- `src/components/dashboard` - service workspace and dashboard modules
- `src/components/layout` and `src/components/shell` - navigation and app shell components
- `src/lib/api.ts` - backend API base URL handling
- `public/src/js` - legacy measurement, report, and catalog scripts used by some tool pages

## Local Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment

Common frontend variables:

- `NEXT_PUBLIC_API_BASE_URL` - backend API URL, usually `http://127.0.0.1:8000`
- `NEXT_PUBLIC_ENABLE_AUTH` - auth flow toggle
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anon key
- `NEXT_PUBLIC_USE_SERVER_REPORT_PIPELINE` - toggles server report generation path
- `NEXT_PUBLIC_SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` - optional telemetry
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - contact/welcome email support for Next.js API routes

## Scripts

```bash
npm run dev          # start the Next.js dev server
npm run dev:clean    # clear .next and start dev
npm run dev:webpack  # force webpack dev mode
npm run build        # create a production build
npm run start        # serve the production build
npm run lint         # run ESLint
npm run typecheck    # run TypeScript without emitting files
npm test             # run Node test suite
```

## Docker

From the repository root:

```bash
docker compose up --build frontend
```

The Docker image builds the app with `npm run build` and serves the standalone Next.js output on port `3000`.
