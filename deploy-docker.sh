#!/usr/bin/env bash
# deploy-docker.sh - Build and run the Smartcar app with Docker Compose
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Default action
ACTION="${1:-up}"

echo "=== Smartcar Docker Deployment ==="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Error: Docker is required but not installed."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Error: Docker Compose v2 is required."; exit 1; }

# Check for .env file
if [ ! -f ".env" ] && [ "$ACTION" = "up" ]; then
    echo "Creating .env from backend/.env.example..."
    cp backend/.env.example .env
    echo "Please edit .env with your Smartcar API credentials before running."
    echo ""
fi

case "$ACTION" in
    up)
        echo "Building and starting containers..."
        docker compose up --build -d
        echo ""
        echo "Services started:"
        echo "  Backend:  http://localhost:${BACKEND_PORT:-3000}"
        echo "  Frontend: http://localhost:${FRONTEND_PORT:-4200}"
        echo ""
        echo "View logs:     docker compose logs -f"
        echo "Stop:          $0 down"
        ;;
    down)
        echo "Stopping containers..."
        docker compose down
        echo "Containers stopped."
        ;;
    restart)
        echo "Restarting containers..."
        docker compose restart
        echo "Containers restarted."
        ;;
    rebuild)
        echo "Rebuilding and restarting containers..."
        docker compose down
        docker compose up --build -d
        echo "Containers rebuilt and started."
        ;;
    logs)
        docker compose logs -f
        ;;
    status)
        docker compose ps
        ;;
    clean)
        echo "Stopping containers and removing volumes..."
        docker compose down -v
        echo "Containers stopped and volumes removed."
        ;;
    *)
        echo "Usage: $0 {up|down|restart|rebuild|logs|status|clean}"
        echo ""
        echo "Commands:"
        echo "  up       - Build and start all services"
        echo "  down     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  rebuild  - Rebuild images and restart"
        echo "  logs     - Follow container logs"
        echo "  status   - Show container status"
        echo "  clean    - Stop and remove all data volumes"
        exit 1
        ;;
esac
