# Backend Dockerfile - Smartcar Express.js API
# Multi-stage build for minimal production image

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY .npmrc package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data /app/logs

# Copy package files and install production dependencies only
COPY .npmrc package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Environment defaults (override via docker-compose or -e flags)
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/app/data/smartcar.db \
    SMARTCAR_CONNECT_MODE=simulated

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
