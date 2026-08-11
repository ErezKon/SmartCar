#!/usr/bin/env bash
# deploy.sh - Build and run the Smartcar app locally (without Docker)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "=== Smartcar Local Deployment ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required but not installed."; exit 1; }
NODE_VERSION=$(node -v | grep -oP '\d+' | head -1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Error: Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi

# --- Backend ---
echo ""
echo "--- Building Backend ---"
cd "$ROOT_DIR/backend"

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm ci
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Warning: backend/.env not found. Copying from .env.example..."
    cp .env.example .env
    echo "Please edit backend/.env with your Smartcar credentials."
fi

echo "Building backend TypeScript..."
npm run build

# --- Frontend ---
echo ""
echo "--- Building Frontend ---"
cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm ci
fi

echo "Building Angular app..."
npx ng build --configuration production

# --- CLI ---
echo ""
echo "--- Building CLI ---"
cd "$ROOT_DIR/cli"

if [ ! -d "node_modules" ]; then
    echo "Installing CLI dependencies..."
    npm ci
fi

echo "Building CLI TypeScript..."
npm run build

# --- Start ---
echo ""
echo "=== Build Complete ==="
echo ""
echo "To start the application:"
echo "  1. Backend:  cd backend && npm start"
echo "  2. Frontend: Serve frontend/dist/frontend/browser with any static server"
echo "  3. CLI:      cd cli && node dist/index.js --help"
echo ""
echo "For development mode:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm start"
