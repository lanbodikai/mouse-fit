# Backend Dockerfile for FastAPI application
FROM python:3.11-slim

ARG MOUSEFIT_ENV_URL=""

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Download shared environment file during build when a URL is provided.
RUN set -eux; \
    if [ -n "$MOUSEFIT_ENV_URL" ]; then \
      echo "Fetching shared env from $MOUSEFIT_ENV_URL"; \
      if curl -fsSL "$MOUSEFIT_ENV_URL" -o /app/.mousefit.env; then \
        sed -i 's/\r$//' /app/.mousefit.env; \
        echo "Shared env downloaded to /app/.mousefit.env"; \
      else \
        echo "WARN: could not download $MOUSEFIT_ENV_URL. Continuing with compose/runtime env only."; \
        rm -f /app/.mousefit.env; \
      fi; \
    fi

# Expose port
EXPOSE 8000

# Run the application
CMD ["sh", "-c", "if [ -f /app/.mousefit.env ]; then set -a; . /app/.mousefit.env; set +a; fi; uvicorn main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-1} --proxy-headers"]
