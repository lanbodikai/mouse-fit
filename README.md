# MouseFit

MouseFit is a personalized gaming mouse recommendation platform built to help players find hardware that actually fits their hand, grip, desk setup, and performance style. Instead of forcing users to compare specs manually, MouseFit turns measurements and preferences into clear product recommendations, fit reports, and guided setup tools.

## What MouseFit Does

MouseFit helps users choose the right mouse by combining physical fit, grip style, product data, and AI-assisted guidance. The platform is designed for gamers, creators, and anyone who wants a more accurate way to pick a mouse than guessing from reviews or spec sheets.

## Key Features

- Personalized mouse recommendations based on hand size, grip style, and user preferences
- Hand measurement workflow for collecting length and width data
- Grip classification tools for palm, claw, fingertip, and hybrid grip styles
- Recommendation reports with ranked mouse matches and fit explanations
- Searchable mouse database with dimensions, weight, shape, connectivity, and product metadata
- AI assistant for mouse questions, comparisons, and catalog guidance
- User dashboard for reports, profile data, settings, and workspace tools
- Authentication-ready user flows with profile and survey state support
- Mousepad, keyboard, desk-height, schedule, and setup-related workspaces
- Backend API for measurements, reports, catalog data, profiles, auth, metrics, and AI routes
- RAG/catalog support for richer AI responses using curated mouse source data
- Dockerized full-stack deployment with frontend, backend, and PostgreSQL services

## Product Experience

MouseFit is built around a guided fitting flow. Users can measure their hand, identify their grip, browse the mouse catalog, and generate a report that ranks mice by compatibility. The dashboard keeps the experience organized across tools, recommendations, account settings, and setup-related services.

The goal is to make mouse selection feel more like a fitment system than a shopping list.

## Tech Stack

Frontend:

- TypeScript
- React
- Next.js App Router
- Tailwind CSS
- Framer Motion
- Lucide React
- Sentry
- Supabase-compatible auth configuration

Backend:

- Python
- FastAPI
- Pydantic
- PostgreSQL
- psycopg and psycopg_pool
- Alembic migrations
- PyJWT
- ChromaDB-backed RAG/catalog components
- Sentry

Infrastructure and tooling:

- Docker
- Docker Compose
- PostgreSQL 16
- Node.js
- npm
- pytest
- ESLint
- TypeScript compiler

## Architecture

MouseFit is split into a Next.js frontend and a FastAPI backend. The frontend powers the landing pages, auth flows, dashboard, measurement tools, catalog views, and reports. The backend manages the API, database persistence, recommendation logic, profile state, catalog data, auth validation, and AI-assisted routes.

PostgreSQL stores mouse catalog records, user measurements, grip data, profiles, survey state, and generated reports. The AI/catalog layer uses curated source data to support more contextual recommendations and product explanations.
