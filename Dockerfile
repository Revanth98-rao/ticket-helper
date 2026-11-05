# Multi-stage production Dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy root workspace definitions
COPY package.json bun.lock* ./
COPY core/package.json ./core/
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install workspace dependencies inside Linux container
RUN bun install

# Copy application source code
COPY core ./core
COPY server ./server
COPY client ./client

# Generate Prisma client for Linux
RUN bun run db:generate

# Build both backend bundle and frontend static assets
RUN bun run build

# --- Runtime Stage ---
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Install openssl and ca-certificates for Prisma engine and secure outgoing API calls
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=5000

# Copy workspace build artifacts, dependencies, and Prisma schema/migrations
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/core ./core
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000

# Health check using dynamic PORT (supports both Railway-assigned and default ports)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/api/health || exit 1

# Execute database migration, admin seed, ticket seed, and start unified Express server
CMD ["sh", "-c", "bun run start"]

