# Frontend Dockerfile - Smartcar Angular App
# Multi-stage build: Angular CLI build + nginx static serve

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY .npmrc package.json package-lock.json ./
RUN npm ci

# Copy source and config files
COPY angular.json tsconfig.json tsconfig.app.json tsconfig.spec.json ./
COPY src/ ./src/

# Build for production
RUN npx ng build --configuration production

# --- Stage 2: Serve with nginx ---
FROM nginx:1.27-alpine

# Copy custom nginx config for SPA routing and API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app from builder
# Angular 17 with application builder outputs to dist/<project>/browser
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:4200/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
