# Smartcar MG4 X Range 2026

A full-stack Node.js application integrating with the [Smartcar API v3](https://smartcar.com/docs/api-reference) for vehicle data, signals, commands, webhooks, and compatibility checking. Built for the MG4 X Range 2026 EV but works with any Smartcar-compatible vehicle.

## Features

- **Vehicle Data** - Read make, model, year, powertrain type, and 94 real-time signals (battery, charging, climate, location, diagnostics, and more)
- **Vehicle Commands** - Start/stop charging, lock/unlock doors, set navigation destinations, manage charge schedules
- **Smartcar Connect** - OAuth 2.0 flow for vehicle authorization (simulated and live modes)
- **SAIC iSmart Direct** - Native integration with the MG/SAIC iSmart API for regions not supported by Smartcar (e.g. Israel). Full telemetry, charging control, lock/unlock, climate, and alarm messages via the reverse-engineered API.
- **Charging Statistics** - Track charging sessions with energy efficiency analysis (kWh/100km). Auto-detection via alarm message polling plus manual logging buttons. Dedicated Statistics page with summary cards, per-session table, and efficiency trend visualization.
- **Provider Switch** - Toggle between Smartcar and SAIC providers in the UI; the dashboard, navigation, and CLI adapt automatically.
- **Webhook Receiver** - HMAC-SHA256 verified webhook endpoint with ngrok tunnel support for development
- **Compatibility Check** - Query Smartcar's compatibility database for supported vehicles
- **Management API** - View applications, secrets, webhooks, and subscriptions

## Architecture

```
  +------------------+          +-------------------+
  |  Smartcar API v3 |          | SAIC iSmart API   |
  +--------+---------+          +--------+----------+
           |                             |
           +-------------+--------------+
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

For SAIC/MG iSmart integration (optional):
```
SAIC_CREDENTIALS_KEY=<generate-a-random-hex-key>
SAIC_REGION=il

# Data refresh mode (default: false — manual refresh only)
SAIC_POLLING_ENABLED=false
# Poll interval in ms (default: 30000). Only used when polling is enabled.
SAIC_POLL_INTERVAL_MS=30000
```

#### SAIC Data Refresh Modes

| `SAIC_POLLING_ENABLED` | Behavior |
|---|---|
| `false` (default) | **Manual mode** — vehicle data is only fetched when you click the refresh button in the UI. This avoids unnecessary 12V battery drain. |
| `true` | **Auto-polling mode** — the backend periodically polls all vehicles for status and charging data at the configured `SAIC_POLL_INTERVAL_MS` interval. The dashboard auto-refreshes to show the latest cached data. The refresh button remains available to force a live wake-up. |

> **Warning:** Aggressive polling drains the 12V battery. The default 30-second interval is suitable when the car is active/charging. Consider increasing the interval for long-term monitoring.

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
smartcar auth status              # Check Smartcar authentication
smartcar vehicle info <id>        # Vehicle attributes
smartcar vehicle signals <id>     # All vehicle signals
smartcar charge start <id>        # Start charging
smartcar lock <id>                # Lock doors
smartcar compat check             # MG4 compatibility

# SAIC / MG iSmart direct integration
smartcar saic login --username <email> --password <pass>
smartcar saic vehicles            # List SAIC vehicles
smartcar saic signals <vin>       # Vehicle signals
smartcar saic charge start <vin>  # Start charging
smartcar saic lock <vin>          # Lock doors
smartcar saic climate <vin>       # Start climate control
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
| [docs/SAIC.md](docs/SAIC.md) | SAIC iSmart integration guide |
| [docs/SAIC-PROTOCOL.md](docs/SAIC-PROTOCOL.md) | SAIC protocol specification |

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
