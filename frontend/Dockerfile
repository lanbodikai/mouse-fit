# Frontend Dockerfile for Next.js application
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG MOUSEFIT_ENV_URL=""

# Download shared env file so build-time env like NEXT_PUBLIC_* can be picked up.
RUN set -eux; \
    if [ -n "$MOUSEFIT_ENV_URL" ]; then \
      echo "Fetching shared env from $MOUSEFIT_ENV_URL"; \
      if wget -qO /app/.mousefit.env "$MOUSEFIT_ENV_URL"; then \
        sed -i 's/\r$//' /app/.mousefit.env; \
        cp /app/.mousefit.env /app/.env.production; \
        echo "Shared env downloaded to /app/.mousefit.env"; \
      else \
        echo "WARN: could not download $MOUSEFIT_ENV_URL. Continuing with defaults."; \
        : > /app/.mousefit.env; \
      fi; \
    else \
      : > /app/.mousefit.env; \
    fi

# Set environment variable for build
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder
COPY --from=builder /app/public ./public

# Shared env downloaded in builder stage.
COPY --from=builder /app/.mousefit.env /app/.mousefit.env

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

# Use the standalone server
CMD ["sh", "-c", "if [ -f /app/.mousefit.env ]; then set -a; . /app/.mousefit.env; set +a; fi; node server.js"]
