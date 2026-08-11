# Smartcar Project Setup Guide

This guide walks through setting up the Smartcar project for local development, including the backend API server, Angular frontend, and CLI tool.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Smartcar Dashboard Setup](#smartcar-dashboard-setup)
- [Clone and Install](#clone-and-install)
- [Configure Environment](#configure-environment)
- [Start Development](#start-development)
- [Smartcar Connect Flow](#smartcar-connect-flow)
- [ngrok for Webhooks](#ngrok-for-webhooks)
- [Docker Deployment](#docker-deployment)
- [Simulated vs Live Mode](#simulated-vs-live-mode)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js 20+** -- Download from [nodejs.org](https://nodejs.org/) or use a version manager like `nvm`
- **npm** -- Included with Node.js
- **Docker and Docker Compose v2** -- Optional, only required for containerized deployment. Download from [docker.com](https://www.docker.com/)

Verify your installations:

```bash
node --version    # Should be v20.x or higher
npm --version     # Should be v10.x or higher
docker --version  # Optional, for Docker deployment
```

---

## Smartcar Dashboard Setup

You need a Smartcar developer account to obtain API credentials.

1. **Create an account** at [dashboard.smartcar.com](https://dashboard.smartcar.com).

2. **Create a new application** in the dashboard.

3. **Obtain your credentials** from the application settings:
   - **Client ID** -- Your application's public identifier.
   - **Client Secret** -- Your application's secret key. Keep this confidential.
   - **App Management Token** -- Found under the Management API section. Required for webhooks, subscriptions, connections, and the Management API endpoints.

4. **Set the redirect URI** to:
   ```
   http://localhost:3000/auth/callback
   ```
   This must match exactly. Add it under the "Redirect URIs" section in your application settings.

5. **Configure permissions** -- Select which vehicle data points and commands your application needs access to (e.g., read vehicle info, read battery level, control charging).

---

## Clone and Install

Navigate to the project directory and install dependencies for each component:

```bash
cd /path/to/smartcar
```

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

### CLI

```bash
cd cli
npm install
```

Each component has its own `package.json` and `node_modules`. They are independent and can be installed in any order.

---

## Configure Environment

1. **Copy the example environment file:**

   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Edit `backend/.env`** and fill in your Smartcar credentials:

   ```env
   SMARTCAR_CLIENT_ID=your-client-id-here
   SMARTCAR_CLIENT_SECRET=your-client-secret-here
   SMARTCAR_REDIRECT_URI=http://localhost:3000/auth/callback
   SMARTCAR_CONNECT_MODE=simulated
   SMARTCAR_APP_MANAGEMENT_TOKEN=your-management-token-here
   PORT=3000
   FRONTEND_URL=http://localhost:4200
   NGROK_AUTHTOKEN=
   DATABASE_PATH=./data/smartcar.db
   ```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMARTCAR_CLIENT_ID` | Yes | -- | Your Smartcar application Client ID. |
| `SMARTCAR_CLIENT_SECRET` | Yes | -- | Your Smartcar application Client Secret. |
| `SMARTCAR_REDIRECT_URI` | No | `http://localhost:3000/auth/callback` | OAuth redirect URI. Must match the dashboard setting. |
| `SMARTCAR_CONNECT_MODE` | No | `simulated` | Default Connect mode: `simulated` or `live`. |
| `SMARTCAR_APP_MANAGEMENT_TOKEN` | Yes | -- | Management API token. Required for webhooks, connections, and management endpoints. |
| `PORT` | No | `3000` | Backend server port. |
| `FRONTEND_URL` | No | `http://localhost:4200` | Frontend URL for CORS and OAuth redirects. |
| `NGROK_AUTHTOKEN` | No | -- | ngrok auth token for automatic webhook tunneling. |
| `DATABASE_PATH` | No | `./data/smartcar.db` | Path to the SQLite database file. |

---

## Start Development

Open three terminal windows or tabs, one for each component:

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

The backend starts on **port 3000** with hot-reload enabled via `tsx watch`. You should see:

```
Smartcar backend server running on port 3000
Mode: simulated
Frontend URL: http://localhost:4200
```

Verify it is running:

```bash
curl http://localhost:3000/health
```

### Terminal 2: Frontend

```bash
cd frontend
npm start
```

The Angular development server starts on **port 4200**. It automatically proxies API requests to the backend on port 3000. Open [http://localhost:4200](http://localhost:4200) in your browser.

### Terminal 3: CLI (optional)

```bash
cd cli
npx tsx src/index.ts --help
```

This displays all available CLI commands. The CLI communicates with the backend API, so the backend must be running first.

---

## Smartcar Connect Flow

Once both the backend and frontend are running:

1. Open [http://localhost:4200/connect](http://localhost:4200/connect) in your browser.

2. Click **Connect Vehicle** (or the equivalent button in the UI).

3. You will be redirected to the Smartcar Connect authorization page.

4. If using **simulated mode** (the default), select a simulated vehicle from the list. No real car is needed.

5. Authorize the application to access vehicle data.

6. After authorization, you are redirected back to the frontend with a success status. The backend now has an access token and can make API calls on behalf of the connected vehicle.

7. Verify the connection:

   ```bash
   # Check auth status
   curl http://localhost:3000/auth/status

   # List connections
   curl http://localhost:3000/api/connections
   ```

---

## ngrok for Webhooks

Smartcar webhooks require a publicly accessible URL to deliver events. During local development, use [ngrok](https://ngrok.com/) to create a tunnel to your backend.

### Automatic Setup

The backend can automatically start an ngrok tunnel on startup:

1. Sign up at [ngrok.com](https://ngrok.com/) and get your auth token.

2. Set the `NGROK_AUTHTOKEN` in your `backend/.env`:

   ```env
   NGROK_AUTHTOKEN=your-ngrok-auth-token-here
   ```

3. Restart the backend. It will automatically start an ngrok tunnel and log the public URL:

   ```
   ngrok tunnel established: https://abc123.ngrok-free.app
   ```

4. Use the ngrok URL as your webhook callback URL in the Smartcar Dashboard:

   ```
   https://abc123.ngrok-free.app/webhooks/receive
   ```

### Manual Setup

If you prefer to run ngrok separately:

```bash
ngrok http 3000
```

Then copy the forwarding URL and configure it as the webhook callback URL in the Smartcar Dashboard, appending `/webhooks/receive`.

---

## Docker Deployment

The project includes Docker configuration for containerized deployment.

### Using docker-compose

1. **Create the root `.env` file** (the deploy script will copy from `backend/.env.example` if it does not exist):

   ```bash
   cp backend/.env.example .env
   ```

   Edit `.env` with your credentials.

2. **Start the containers:**

   ```bash
   ./deploy-docker.sh up
   ```

   This builds and starts both the backend and frontend containers:
   - Backend: `http://localhost:3000`
   - Frontend: `http://localhost:4200`

3. **Other commands:**

   ```bash
   ./deploy-docker.sh down      # Stop all services
   ./deploy-docker.sh restart   # Restart all services
   ./deploy-docker.sh rebuild   # Rebuild images and restart
   ./deploy-docker.sh logs      # Follow container logs
   ./deploy-docker.sh status    # Show container status
   ./deploy-docker.sh clean     # Stop and remove all data volumes
   ```

### Docker Environment Variables

The `docker-compose.yml` reads from the root `.env` file. You can override the default ports:

```env
BACKEND_PORT=3000
FRONTEND_PORT=4200
```

### Volumes

Docker Compose creates two named volumes for persistent data:

- `backend-data` -- SQLite database (`smartcar.db`)
- `backend-logs` -- Application log files

---

## Simulated vs Live Mode

Smartcar provides two modes for the Connect flow:

### Simulated Mode

```env
SMARTCAR_CONNECT_MODE=simulated
```

- Uses Smartcar's simulated vehicles -- no real car required.
- Returns realistic but fake data for all signals and commands.
- Ideal for development, testing, and demos.
- This is the default mode.

You can also override the mode per request by passing the `mode` query parameter to `/auth/connect`:

```
http://localhost:3000/auth/connect?mode=simulated
```

### Live Mode

```env
SMARTCAR_CONNECT_MODE=live
```

- Connects to real vehicles through the vehicle manufacturer's API.
- Requires the user to log in with their actual vehicle account (e.g., Tesla, BMW).
- Returns real vehicle data and executes real commands.
- Use only when testing with a real vehicle.

You can override to live mode per request:

```
http://localhost:3000/auth/connect?mode=live
```

---

## Troubleshooting

### CORS Errors

**Symptom:** Browser console shows `Access-Control-Allow-Origin` errors when the frontend calls the backend.

**Solutions:**
- Ensure the backend is running on port 3000.
- Verify `FRONTEND_URL` in `backend/.env` matches the frontend URL exactly (default: `http://localhost:4200`). Do not include a trailing slash.
- Check that the frontend dev server is properly proxying requests to the backend.

### Authentication Failures

**Symptom:** API calls return `401 Authentication required`.

**Solutions:**
- Complete the Smartcar Connect flow first by visiting `http://localhost:4200/connect`.
- Check that `SMARTCAR_CLIENT_ID` and `SMARTCAR_CLIENT_SECRET` are set correctly in `backend/.env`.
- Verify your redirect URI in the Smartcar Dashboard matches `http://localhost:3000/auth/callback` exactly.
- Try forcing a token refresh: `curl -X POST http://localhost:3000/auth/token`.
- Check the auth status: `curl http://localhost:3000/auth/status`.

### Missing Environment Variables

**Symptom:** Server crashes on startup with `Missing required environment variable`.

**Solutions:**
- Ensure `backend/.env` exists. Copy from `backend/.env.example` if needed.
- Fill in at minimum `SMARTCAR_CLIENT_ID` and `SMARTCAR_CLIENT_SECRET`.
- The `SMARTCAR_APP_MANAGEMENT_TOKEN` is required for webhook, connection, and management API endpoints.

### Database Issues

**Symptom:** Errors related to SQLite or database operations.

**Solutions:**
- The database is created automatically at the path specified by `DATABASE_PATH`.
- Ensure the `backend/data/` directory exists and is writable.
- To reset the database, delete `backend/data/smartcar.db` and restart the backend.

### Webhook Delivery Failures

**Symptom:** Smartcar shows webhook delivery errors in the dashboard.

**Solutions:**
- Ensure ngrok is running and the tunnel URL is configured in the Smartcar Dashboard.
- The webhook URL must end with `/webhooks/receive` (e.g., `https://abc123.ngrok-free.app/webhooks/receive`).
- Verify `SMARTCAR_APP_MANAGEMENT_TOKEN` is set -- it is used to verify webhook signatures.
- Check the backend logs for signature verification errors: `cat backend/logs/error.log`.
- If using the free ngrok plan, the tunnel URL changes each time. Update the dashboard accordingly.

### Port Conflicts

**Symptom:** `EADDRINUSE` error on startup.

**Solutions:**
- Another process is using port 3000 or 4200. Find and stop it:
  ```bash
  lsof -i :3000
  kill <PID>
  ```
- Or change the port in `backend/.env` (`PORT=3001`) and update `FRONTEND_URL` accordingly.

### Frontend Build Errors

**Symptom:** `ng serve` fails with compilation errors.

**Solutions:**
- Ensure you are using a compatible Node.js version (v20+).
- Delete `node_modules` and reinstall: `cd frontend && rm -rf node_modules && npm install`.
- Clear the Angular cache: `rm -rf frontend/.angular/cache`.
