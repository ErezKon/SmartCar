# System Architecture

## Smartcar MG4 X Range 2026 Integration App

---

## 1. Overview

This is a full-stack Node.js application that integrates with the Smartcar API v3 and the SAIC iSmart API to provide vehicle data retrieval and remote command execution for the MG4. The system supports two providers — Smartcar (OAuth-based) and SAIC iSmart (direct API, for regions Smartcar does not support such as Israel) — with a runtime toggle in the UI and CLI.

The system is composed of three main components:

- **Express Backend** -- A REST API server that handles authentication, proxies requests to external vehicle APIs (Smartcar and SAIC), manages persistent storage, and processes incoming webhooks.
- **Angular 17 Frontend** -- A single-page application providing a dashboard interface for monitoring vehicle signals, issuing commands, managing connections, and configuring webhooks. A provider toggle switches between Smartcar and SAIC views.
- **Commander.js CLI** -- A terminal-based tool for interacting with the backend API directly from the command line, with separate command groups for Smartcar and SAIC operations.

All three components share a common backend API surface, with the frontend and CLI acting as independent consumers.

---

## 2. Architecture Diagram

```
  +------------------+          +-------------------+
  |  Smartcar API v3 |          | SAIC iSmart API   |
  |  (External)      |          | (External)        |
  +--------+---------+          +--------+----------+
           |                             |
           +-------------+--------------+
                          |
                 +--------+---------+
                 |  Express Backend |
                 |  (Port 3000)     |
                 |  - Auth/OAuth    |
                 |  - SAIC Module   |
                 |  - API Proxy     |
                 |  - SQLite DB     |
                 |  - Webhooks      |
                 +----+--------+----+
                      |        |
           +----------+        +----------+
           |                              |
 +---------+----------+     +-------------+---------+
 | Angular Frontend   |     |   CLI Tool            |
 | (Port 4200)        |     |   (Commander.js)      |
 | - Material UI      |     |   - Terminal commands  |
 | - Provider Switch  |     |   - saic command group |
 | - Proxy to backend |     |   - Calls backend API |
 +--------------------+     +-----------------------+
```

The Express backend is the central hub. It communicates with both the external Smartcar API (via OAuth 2.0) and the SAIC iSmart API (via encrypted direct requests). Both the Angular frontend and the CLI tool interact exclusively through the backend's REST endpoints. The frontend proxies API calls during development via the Angular dev server proxy configuration, and in production via an nginx reverse proxy.

---

## 3. Technology Stack

| Layer       | Technology                        | Version / Notes                          |
|-------------|-----------------------------------|------------------------------------------|
| Runtime     | Node.js                           | 20+                                      |
| Language    | TypeScript                        | Strict mode, shared across all layers    |
| Backend     | Express                           | 4.x                                      |
| Frontend    | Angular                           | 17 (standalone components)               |
| CLI         | Commander.js                      | Latest                                   |
| Database    | SQLite via sql.js                 | In-memory with file persistence          |
| UI Library  | Angular Material                  | 17.x                                     |
| Web Server  | nginx                             | Docker-based, serves frontend + proxy    |
| Containers  | Docker, docker-compose            | Multi-container orchestration            |

---

## 4. Backend Architecture

The backend follows a layered architecture with clear separation of concerns. Each layer depends only on the layers below it.

### 4.1 Config Layer

- **`env.ts`** -- Loads and validates environment variables with typed accessors. Centralizes all configuration (Smartcar credentials, database path, port, webhook secret, ngrok settings) with sensible defaults for local development.
- **`constants.ts`** -- Defines static values: Smartcar API base URLs, OAuth endpoints, supported signal catalog entries, rate limit thresholds, and default timeout values.

### 4.2 Database Layer

The database layer uses **sql.js**, a WebAssembly-compiled SQLite implementation that runs entirely in-process without native dependencies.

- **Initialization** -- On startup, the database is loaded from a file (if it exists) or created fresh. A migration runner applies schema changes sequentially.
- **Migrations** -- Stored as numbered SQL files or inline migration definitions. Each migration runs inside a transaction with a version tracking table to prevent re-application.
- **Repository Classes** -- Six repository classes encapsulate all database operations:
  - `TokenRepository` -- Stores and retrieves OAuth tokens (access and refresh), handles expiry tracking.
  - `UserRepository` -- Manages Smartcar user records created during the Connect flow.
  - `ConnectionRepository` -- Tracks active Smartcar Connect sessions and their associated user/vehicle mappings.
  - `VehicleRepository` -- Persists vehicle metadata (VIN, make, model, year) and cached signal data.
  - `WebhookRepository` -- Stores incoming webhook event payloads with timestamps and processing status.
  - `SignalAndCommandLogRepository` -- Records signal snapshots and command execution logs with request/response payloads and status codes.

### 4.3 Auth Layer

Authentication is handled through two distinct OAuth 2.0 flows:

- **Client Credentials Flow** -- Used for management-level API calls (compatibility checks, webhook registration). The backend requests a token using the application's client ID and secret, caches it in SQLite, and automatically refreshes it before expiry.
- **Smartcar Connect Flow** -- Used to authorize access to a specific user's vehicles. The backend generates an authorization URL, the user completes consent in the browser, and the callback endpoint receives an authorization code that is exchanged for user-scoped tokens.

Token caching ensures that redundant token requests are avoided. The auto-refresh mechanism checks token expiry before each API call and refreshes proactively when the remaining lifetime falls below a configurable threshold.

### 4.4 API Layer

The API layer provides typed HTTP clients for communicating with Smartcar's external services.

- **`SmartcarClient`** -- The base HTTP client. Wraps `fetch` (or `axios`) with:
  - Automatic Bearer token injection from the auth layer.
  - Exponential backoff retry logic for transient failures (5xx, network errors).
  - Rate limit handling: detects `429` responses, reads the `Retry-After` header, and waits before retrying.
  - Request/response logging for debugging.
- **`connections.ts`** -- Manages the Smartcar Connect lifecycle: generating auth URLs, handling callbacks, listing connected vehicles.
- **`vehicles.ts`** -- Retrieves vehicle attributes, location, odometer, tire pressure, battery/charge status, and other signals from the Smartcar API.
- **`commands.ts`** -- Sends remote commands to vehicles (lock, unlock, start/stop charge) and polls for command completion status.
- **`management.ts`** -- Interfaces with Smartcar's Management API for application-level operations (listing connections, revoking access).
- **`compatibility.ts`** -- Checks vehicle compatibility by VIN against the Smartcar platform, returning supported permissions and endpoints.

### 4.5 Routes Layer

Express route modules map HTTP endpoints to business logic:

| Route Group       | Base Path           | Purpose                                          |
|-------------------|---------------------|--------------------------------------------------|
| `auth`            | `/api/auth`         | Token status, Connect URL generation, callback   |
| `connections`     | `/api/connections`  | List, create, delete Smartcar connections         |
| `vehicles`        | `/api/vehicles`     | Vehicle list, signals, attributes, location      |
| `commands`        | `/api/commands`     | Send lock/unlock/charge commands, check status   |
| `webhooks`        | `/api/webhooks`     | Register, list, delete webhooks; receive events  |
| `compatibility`   | `/api/compatibility`| VIN compatibility checks                         |
| `management`      | `/api/management`   | Application-level management operations          |
| `saic`            | `/api/saic`         | SAIC iSmart: account, vehicles, status, commands, messages |

### 4.6 SAIC Module

The SAIC module (`src/saic/`) is a self-contained integration with the MG iSmart API. It does not share code with the Smartcar API layer.

- **`config.ts`** -- Region-to-gateway map (8 regions including Israel), tenant ID, app version, polling constants.
- **`crypto.ts`** -- AES-128-CBC encryption/decryption of API request/response bodies, HMAC-SHA256 verification string computation.
- **`client.ts`** -- `SaicClient` class: header assembly, body encryption, response decryption, event-ID polling loop for async API responses.
- **`auth.ts`** -- Login (SHA-1 password hash, form-encoded), token cache with expiry, single-flight lock to prevent concurrent logins.
- **`credentials.ts`** -- AES-256-GCM encryption of stored credentials using `SAIC_CREDENTIALS_KEY`.
- **`vehicles.ts`** -- Vehicle list, status, charging data, messages. Cached-by-default reads; live refresh is explicit and rate-limited.
- **`commands.ts`** -- Vehicle control commands (lock/unlock, climate, charging, find car). Per-VIN mutex serialization, command logging.
- **`normalize.ts`** -- Maps SAIC fields onto the app's signal-code vocabulary for the unified dashboard.
- **`errors.ts`** -- Typed error classes for auth, vehicle-asleep, throttling, and PIN-required conditions.

### 4.7 Middleware

- **Auth Middleware** -- Applied to all `/api/*` routes (except the auth callback and webhook receiver). Validates that a valid token exists in the database, extracts the associated user ID, and attaches it to the request context. Returns `401` if no valid session is found.
- **Webhook Verification Middleware** -- Applied to the webhook receiver endpoint. Computes an HMAC-SHA256 signature over the raw request body using the configured webhook secret, then compares it to the signature provided in the request header. Rejects requests with mismatched or missing signatures with a `403` response.

---

## 5. Frontend Architecture

The Angular 17 frontend uses standalone components throughout, with lazy-loaded routes for code splitting.

### 5.1 Core Services

- **`SmartcarApiService`** -- Central HTTP service that wraps all backend API calls. Provides typed methods for each endpoint group (vehicles, commands, signals, webhooks, etc.). Handles request construction and response deserialization.
- **`AuthService`** -- Manages frontend authentication state. Checks token validity with the backend, triggers the Connect flow when needed, and exposes observable auth state for reactive UI updates.
- **Error Interceptor** -- An Angular HTTP interceptor that catches error responses globally. Displays user-friendly error notifications via Angular Material snackbar, handles `401` responses by redirecting to the auth flow, and logs errors for debugging.

### 5.2 Shared Components

Four reusable components are shared across feature pages:

| Component            | Purpose                                                        |
|----------------------|----------------------------------------------------------------|
| `signal-card`        | Displays a single vehicle signal (e.g., battery level, odometer) with label, value, unit, and timestamp. |
| `command-button`     | A button that triggers a vehicle command, shows loading state during execution, and displays success/failure feedback. |
| `vehicle-selector`   | A dropdown selector for switching between connected vehicles. Emits the selected vehicle ID to parent components. |
| `status-badge`       | A color-coded badge indicating status (connected, disconnected, pending, error). Used across multiple pages. |

### 5.3 Feature Pages

| Page            | Route              | Description                                                      |
|-----------------|--------------------|------------------------------------------------------------------|
| Dashboard       | `/`                | Overview of the active vehicle: key signals, recent commands, connection status. |
| Connect         | `/connect`         | Initiates the Smartcar Connect flow. Displays authorization URL or embedded redirect. |
| Signals         | `/signals`         | Full signal catalog for the selected vehicle. Displays all available readings with refresh controls. |
| Commands        | `/commands`        | Lists available remote commands with execution buttons. Shows command history from the log. |
| Webhooks        | `/webhooks`        | Webhook configuration panel. Register/unregister webhooks, view received event history. |
| Compatibility   | `/compatibility`   | VIN lookup tool. Enter a VIN to check Smartcar compatibility and supported features. |
| Settings        | `/settings`        | Application configuration: credentials status, database info, ngrok tunnel status, environment details. |

### 5.4 Routing

Routes are configured with lazy loading to minimize initial bundle size. Each feature page is a standalone component loaded on demand. Route guards protect pages that require an active connection, redirecting unauthenticated users to the Connect page.

---

## 6. Data Flow

### 6.1 Authentication (Client Credentials)

```
Backend Startup
    |
    v
POST /oauth/token (client_id + client_secret)
    |
    v
Receive access_token + expires_in
    |
    v
Store in SQLite (tokens table)
    |
    v
Auto-refresh before expiry on subsequent API calls
```

### 6.2 Smartcar Connect (User Authorization)

```
Frontend                    Backend                     Smartcar
   |                           |                           |
   |-- GET /api/auth/url ----->|                           |
   |<-- Authorization URL -----|                           |
   |                           |                           |
   |-- Redirect user -------->|---------->|                |
   |                           |          | User consents  |
   |                           |<---------| Callback w/    |
   |                           |            auth code      |
   |                           |                           |
   |                           |-- Exchange code --------->|
   |                           |<-- user_id + tokens ------|
   |                           |                           |
   |                           |-- Store in SQLite         |
   |<-- Session established ---|                           |
```

### 6.3 Vehicle Data Retrieval

```
Frontend                    Backend                     Smartcar API
   |                           |                           |
   |-- GET /api/vehicles ----->|                           |
   |                           |-- GET /vehicles --------->|
   |                           |<-- Vehicle list ----------|
   |                           |-- Cache in SQLite         |
   |<-- Vehicle data ----------|                           |
   |                           |                           |
   |-- GET /api/vehicles/:id ->|                           |
   |     /signals              |-- GET /vehicles/:id/ ---->|
   |                           |     battery, odometer,... |
   |                           |<-- Signal values ---------|
   |                           |-- Store in signal_snapshots|
   |<-- Signal data -----------|                           |
```

### 6.4 Command Execution

```
Frontend                    Backend                     Smartcar API
   |                           |                           |
   |-- POST /api/commands ---->|                           |
   |     { vehicleId, action } |                           |
   |                           |-- POST /vehicles/:id/ --->|
   |                           |     /lock, /unlock, etc.  |
   |                           |<-- Command status --------|
   |                           |-- Log in command_logs     |
   |<-- Command result --------|                           |
```

### 6.5 Webhook Reception

```
Smartcar                    ngrok                       Backend
   |                           |                           |
   |-- POST webhook event ---->|                           |
   |                           |-- Forward to localhost -->|
   |                           |     :3000/api/webhooks    |
   |                           |     /receive              |
   |                           |                           |
   |                           |     Verify HMAC-SHA256    |
   |                           |     signature             |
   |                           |                           |
   |                           |     Store in              |
   |                           |     webhook_events table  |
   |                           |                           |
   |                           |<-- 200 OK ----------------|
   |<-- 200 OK ----------------|                           |
```

---

## 7. Database Schema

The SQLite database contains thirteen tables — seven for Smartcar and six for SAIC:

**Smartcar tables:**

| Table               | Purpose                                                                                  |
|---------------------|------------------------------------------------------------------------------------------|
| `tokens`            | Stores OAuth access and refresh tokens with expiry timestamps. Keyed by token type (client credentials vs. user-scoped). |
| `users`             | Records Smartcar user IDs returned during the Connect flow, along with creation timestamps. |
| `connections`       | Tracks active connections between users and the application, including authorization state and granted permissions. |
| `vehicles`          | Persists vehicle metadata: Smartcar vehicle ID, VIN, make, model, year. Linked to connections. |
| `webhook_events`    | Stores raw webhook event payloads received from Smartcar, with timestamps, event type, and processing status. |
| `signal_snapshots`  | Caches the most recent signal readings for each vehicle (battery level, odometer, location, tire pressure, etc.) with retrieval timestamps. |
| `command_logs`      | Records every command sent to a vehicle: command type, request payload, response payload, HTTP status code, and execution timestamp. Used for auditing and the command history UI. |

**SAIC tables:**

| Table                  | Purpose                                                                                  |
|------------------------|------------------------------------------------------------------------------------------|
| `saic_accounts`        | Stores SAIC iSmart account credentials (username, encrypted password, region).           |
| `saic_tokens`          | Caches SAIC API access tokens with expiry timestamps per account.                        |
| `saic_vehicles`        | Persists vehicle metadata from the SAIC API (VIN, model, configuration).                 |
| `saic_state_snapshots` | Caches vehicle state fields (SOC, range, temperature, lock status, etc.) with timestamps. Indexed on (vin, field). |
| `saic_command_logs`    | Records every command sent via the SAIC API with event ID, status, duration, and payloads. Indexed on (vin, created_at). |
| `saic_messages`        | Stores alarm/command/news messages from the SAIC API with unique message IDs.            |

All tables include standard `created_at` and `updated_at` timestamp columns managed at the repository level.

---

## 8. Docker Deployment

The application is deployed as two containers orchestrated with docker-compose:

### Container 1: Backend

- **Base image**: `node:20-alpine`
- **Runs**: The compiled Express server on port 3000.
- **Volume mount**: A host directory is mounted to persist the SQLite database file across container restarts.
- **Environment**: Configured via environment variables or a `.env` file referenced in the compose file.

### Container 2: Frontend / nginx

- **Build stage**: An Angular production build (`ng build`) outputs static files.
- **Runtime image**: `nginx:alpine` serves the built static files.
- **nginx config**: Serves the Angular app on port 80, proxies `/api/*` requests to the backend container on port 3000, and handles SPA routing by falling back to `index.html` for unmatched routes.

### docker-compose Orchestration

```yaml
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data    # SQLite persistence
    env_file:
      - .env

  frontend:
    build:
      context: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

The `depends_on` directive ensures the backend starts before the frontend container. The SQLite database file is stored in a mounted volume (`./data`) so that data survives container recreation.

---

## 9. Security Considerations

### Credentials Isolation

Smartcar client ID, client secret, and webhook secret are stored exclusively as server-side environment variables. They are never exposed to the frontend or included in client-side bundles. The Angular app communicates only with the backend proxy and has no direct knowledge of Smartcar credentials.

### Webhook Verification

All incoming webhook requests are verified using HMAC-SHA256. The backend computes a signature over the raw request body using the stored webhook secret and compares it against the signature header sent by Smartcar. Requests with invalid or missing signatures are rejected immediately with a `403` status.

### HTTP Security Headers

The Express backend uses `helmet` middleware to set security-related HTTP headers including:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (when behind TLS)
- `Content-Security-Policy` (restrictive default)

### CORS Policy

CORS is configured to allow requests only from the expected frontend origin (localhost:4200 in development, the production domain in deployment). Credentials are included in CORS responses to support cookie-based sessions if needed.

### Proxy Architecture

The frontend never communicates directly with the Smartcar API. All external API calls are funneled through the Express backend, which acts as a controlled proxy. This provides a single point for authentication enforcement, rate limiting, logging, and access control. The backend can revoke access, throttle requests, or filter responses without any frontend changes.

### SAIC Credential Security

SAIC account passwords are encrypted at rest using AES-256-GCM with a key derived from the `SAIC_CREDENTIALS_KEY` environment variable. Loss of this key makes stored credentials unrecoverable. Passwords are never returned in API responses or logged. A sensitive-data redaction helper is applied to all error messages before they are sent to the client, preventing accidental leakage of tokens or credentials in error responses.

SAIC API endpoints are rate-limited server-side: login attempts (5/15min), live refresh (6/5min), and commands (10/min).

### Database Security

The SQLite database file should be stored with restrictive file permissions (readable only by the application user). Tokens stored in the database are sensitive credentials; in a production deployment, the database volume should be encrypted at rest.
