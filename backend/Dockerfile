# syntax=docker/dockerfile:1.7
# Backend Dockerfile for FastAPI application
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --prefer-binary -r requirements.txt

# Copy backend code
COPY . .

# Expose port
EXPOSE 8000

# Run migrations then start the application
CMD ["sh", "-c", "alembic -c alembic.ini upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-1} --proxy-headers"]
