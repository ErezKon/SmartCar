# Smartcar MG4 X Range 2026

A full-stack Node.js application integrating with the [Smartcar API v3](https://smartcar.com/docs/api-reference) for vehicle data, signals, commands, webhooks, and compatibility checking. Built for the MG4 X Range 2026 EV but works with any Smartcar-compatible vehicle.

## Features

- **Vehicle Data** - Read make, model, year, powertrain type, and 94 real-time signals (battery, charging, climate, location, diagnostics, and more)
- **Vehicle Commands** - Start/stop charging, lock/unlock doors, set navigation destinations, manage charge schedules
- **Smartcar Connect** - OAuth 2.0 flow for vehicle authorization (simulated and live modes)
- **Webhook Receiver** - HMAC-SHA256 verified webhook endpoint with ngrok tunnel support for development
- **Compatibility Check** - Query Smartcar's compatibility database for supported vehicles
- **Management API** - View applications, secrets, webhooks, and subscriptions

## Architecture

```
                    +------------------+
                    |  Smartcar API v3 |
                    +--------+---------+
                             |
                    +--------+---------+
                    |  Express Backend |
                    |  (Port 3000)     |
                    +----+--------+----+
                         |        |
              +----------+        +----------+
              |                              |
    +---------+----------+     +-------------+---------+
    | Angular Frontend   |     |   CLI Tool            |
    | (Port 4200)        |     |   (Commander.js)      |
    +--------------------+     +-----------------------+
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20+, TypeScript |
| Backend | Express 4.x |
| Frontend | Angular 17, Angular Material |
| CLI | Commander.js, Inquirer.js |
| Database | SQLite (sql.js) |
| Docker | node:20-alpine, nginx:1.27-alpine |

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- A [Smartcar](https://dashboard.smartcar.com) developer account

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../cli && npm install
```

Or from the project root:

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in your Smartcar credentials:

```
SMARTCAR_CLIENT_ID=your-client-id
SMARTCAR_CLIENT_SECRET=your-client-secret
SMARTCAR_APP_MANAGEMENT_TOKEN=your-management-token
```

### 3. Start development servers

**Backend** (port 3000):
```bash
cd backend && npm run dev
```

**Frontend** (port 4200, auto-proxies API calls to backend):
```bash
cd frontend && npm start
```

Or start both from the project root:
```bash
npm run dev
```

### 4. Connect a vehicle

1. Open http://localhost:4200/connect
2. Click "Connect Vehicle" (defaults to simulated mode)
3. Authorize a simulated vehicle in the Smartcar Connect flow
4. Return to the dashboard to see vehicle data

## Docker Deployment

```bash
# Copy env file
cp backend/.env.example .env
# Edit .env with your credentials

# Build and start
./deploy-docker.sh up

# View logs
./deploy-docker.sh logs

# Stop
./deploy-docker.sh down
```

Services:
- Backend: http://localhost:3000
- Frontend: http://localhost:4200

## CLI Usage

```bash
cd cli
npx tsx src/index.ts --help
```

Key commands:
```bash
smartcar auth status              # Check authentication
smartcar vehicle info <id>        # Vehicle attributes
smartcar vehicle signals <id>     # All vehicle signals
smartcar charge start <id>        # Start charging
smartcar lock <id>                # Lock doors
smartcar compat check             # MG4 compatibility
```

See [docs/CLI.md](docs/CLI.md) for full command reference.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/SETUP.md](docs/SETUP.md) | Step-by-step setup guide |
| [docs/API.md](docs/API.md) | Backend REST API reference |
| [docs/SIGNALS.md](docs/SIGNALS.md) | Vehicle signal codes catalog |
| [docs/CLI.md](docs/CLI.md) | CLI command reference |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |

## Project Structure

```
smartcar/
  backend/          Express.js REST server (TypeScript)
  frontend/         Angular 17 app (standalone components, Material UI)
  cli/              CLI tool (Commander.js)
  docs/             Documentation
  docker-compose.yml
  deploy.sh         Local build & deploy
  deploy-docker.sh  Docker build & deploy
```

## License

ISC
