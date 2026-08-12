# Smartcar Backend API Reference

Base URL: `http://localhost:3000`

All endpoints return JSON responses. Errors follow the format:

```json
{
  "error": "Short error description",
  "message": "Detailed error message"
}
```

---

## Table of Contents

- [Health Check](#health-check)
- [Authentication](#authentication)
- [Connections](#connections)
- [Vehicles](#vehicles)
- [Commands](#commands)
- [Webhooks](#webhooks)
- [Compatibility](#compatibility)
- [Management](#management)

---

## Health Check

### GET /health

Returns the current server status.

**Authentication:** None

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

**Example:**

```bash
curl http://localhost:3000/health
```

---

## Authentication

These routes handle Smartcar Connect OAuth flow and token management. No `Authorization` header is required for these endpoints -- the backend manages tokens internally.

### GET /auth/connect

Redirects the user to the Smartcar Connect authorization page. After the user authorizes, Smartcar redirects back to `/auth/callback`.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | string | No | `simulated` or `live`. Defaults to the server's `SMARTCAR_CONNECT_MODE` setting. |
| `make` | string | No | Filter to a specific vehicle make (e.g., `TESLA`, `BMW`). |
| `single_select` | string | No | Set to `true` to allow selecting only one vehicle. |
| `single_select_vin` | string | No | Pre-select a specific vehicle by VIN. |
| `state` | string | No | Opaque state string passed through the OAuth flow. |

**Response:** HTTP 302 redirect to Smartcar Connect.

**Example:**

```bash
# Open in a browser -- this is a redirect endpoint
curl -v "http://localhost:3000/auth/connect?mode=simulated&single_select=true"
```

---

### GET /auth/callback

OAuth callback handler. Smartcar redirects here after the user authorizes (or denies) access. The backend exchanges the authorization code for tokens, stores the user, and redirects to the frontend.

**Query Parameters (set by Smartcar):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | Smartcar user ID (on success). |
| `error` | string | Error code (on failure). |
| `error_description` | string | Human-readable error description (on failure). |
| `state` | string | State value passed through from `/auth/connect`. |

**Response:** HTTP 302 redirect to `{FRONTEND_URL}/connect?status=success&user_id={userId}` on success, or `{FRONTEND_URL}/connect?status=error&message={message}` on failure.

**Note:** This endpoint is called by Smartcar's servers, not directly by your application. The redirect URI must be registered in the Smartcar Dashboard as `http://localhost:3000/auth/callback`.

---

### GET /auth/status

Returns the current authentication status, including token information and connected users.

**Authentication:** None

**Response:**

```json
{
  "token": {
    "hasToken": true,
    "expiresAt": "2025-01-15T14:00:00.000Z",
    "remainingSeconds": 7200
  },
  "users": [
    {
      "userId": "abc-123",
      "externalId": "ext-456",
      "createdAt": "2025-01-15T12:00:00.000Z"
    }
  ],
  "connectedUsers": 1
}
```

**Example:**

```bash
curl http://localhost:3000/auth/status
```

---

### POST /auth/token

Force a token refresh. Useful when the token is expired or about to expire.

**Authentication:** None

**Response:**

```json
{
  "message": "Token refreshed successfully",
  "token": {
    "hasToken": true,
    "expiresAt": "2025-01-15T14:00:00.000Z",
    "remainingSeconds": 7200,
    "preview": "eyJhbGciOi..."
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/auth/token
```

---

### GET /auth/token

Returns current token metadata without exposing the full token value.

**Authentication:** None

**Response:**

```json
{
  "hasToken": true,
  "expiresAt": "2025-01-15T14:00:00.000Z",
  "remainingSeconds": 7200
}
```

**Example:**

```bash
curl http://localhost:3000/auth/token
```

---

## Connections

All connection endpoints require authentication (a valid Smartcar access token must be stored in the backend). The backend proxies requests to the Smartcar Management API and caches results in SQLite.

### GET /api/connections

List all connections with optional filters and pagination.

**Authentication:** Required (internal token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | No | Filter by Smartcar user ID. |
| `vehicleId` | string | No | Filter by vehicle ID. |
| `vehicleMode` | string | No | Filter by vehicle mode (e.g., `simulated`, `live`). |
| `userExternalId` | string | No | Filter by external user ID. |
| `pageNumber` | integer | No | Page number for pagination. |
| `pageSize` | integer | No | Number of results per page. |

**Response:**

```json
{
  "data": [
    {
      "id": "conn-abc-123",
      "attributes": {
        "userId": "user-456",
        "vehicleId": "vehicle-789",
        "vehicle": {
          "mode": "simulated"
        }
      }
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/api/connections

# With filters
curl "http://localhost:3000/api/connections?userId=user-456&pageSize=10"
```

---

### GET /api/connections/:connectionId

Get a single connection by ID.

**Authentication:** Required (internal token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `connectionId` | string | The connection ID. |

**Response:**

```json
{
  "data": {
    "id": "conn-abc-123",
    "attributes": {
      "userId": "user-456",
      "vehicleId": "vehicle-789",
      "vehicle": {
        "mode": "simulated"
      }
    }
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/connections/conn-abc-123
```

---

### DELETE /api/connections/:connectionId

Remove a connection. This revokes the vehicle's access through Smartcar and removes it from the local cache.

**Authentication:** Required (internal token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `connectionId` | string | The connection ID to remove. |

**Response:**

```json
{
  "message": "Connection conn-abc-123 removed successfully"
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/connections/conn-abc-123
```

---

### DELETE /api/connections/users/:userId

Remove a user and all their associated connections.

**Authentication:** Required (internal token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | The Smartcar user ID to remove. |

**Response:**

```json
{
  "message": "User user-456 and all connections removed successfully"
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/connections/users/user-456
```

---

## Vehicles

### GET /api/vehicles/signals/catalog

Returns the complete catalog of supported signal codes. This is local data and does not require authentication.

**Authentication:** None

**Response:**

```json
{
  "signals": {
    "BATTERY_LEVEL": { "description": "...", "group": "battery" },
    "ODOMETER": { "description": "...", "group": "location" }
  },
  "groups": {
    "battery": ["BATTERY_LEVEL", "BATTERY_CAPACITY", "..."],
    "location": ["ODOMETER", "LATITUDE", "..."]
  },
  "totalSignals": 42
}
```

**Example:**

```bash
curl http://localhost:3000/api/vehicles/signals/catalog
```

---

### GET /api/vehicles/:vehicleId

Get vehicle attributes (make, model, year, powertrain type).

**Authentication:** Required (internal token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Response:**

```json
{
  "data": {
    "attributes": {
      "make": "TESLA",
      "model": "Model 3",
      "year": 2023,
      "powertrainType": "BEV"
    }
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/vehicles/vehicle-789
```

---

### GET /api/vehicles/:vehicleId/signals

Get all available signals for a vehicle. Results are cached in SQLite for historical tracking.

**Authentication:** Required (internal token)

**Required Headers:**

| Header | Description |
|--------|-------------|
| `sc-user-id` | The Smartcar user ID that owns the vehicle. Can also be passed as a `userId` query parameter. |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Response:**

```json
{
  "data": [
    {
      "attributes": {
        "code": "BATTERY_LEVEL",
        "value": 72.5,
        "dataAge": "2025-01-15T12:00:00.000Z"
      }
    },
    {
      "attributes": {
        "code": "ODOMETER",
        "value": 15234.5,
        "dataAge": "2025-01-15T12:00:00.000Z"
      }
    }
  ]
}
```

**Example:**

```bash
curl -H "sc-user-id: user-456" \
  http://localhost:3000/api/vehicles/vehicle-789/signals
```

---

### GET /api/vehicles/:vehicleId/signals/:signalCode

Get a specific signal value for a vehicle. The signal code is validated against the catalog before making the API call.

**Authentication:** Required (internal token)

**Required Headers:**

| Header | Description |
|--------|-------------|
| `sc-user-id` | The Smartcar user ID that owns the vehicle. Can also be passed as a `userId` query parameter. |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |
| `signalCode` | string | The signal code (e.g., `BATTERY_LEVEL`, `ODOMETER`). Use `/api/vehicles/signals/catalog` to see all valid codes. |

**Response:**

```json
{
  "data": {
    "attributes": {
      "code": "BATTERY_LEVEL",
      "value": 72.5,
      "dataAge": "2025-01-15T12:00:00.000Z"
    }
  }
}
```

**Error Response (invalid signal code):**

```json
{
  "error": "Invalid signal code",
  "message": "Signal code 'INVALID' is not recognized. Use GET /api/signals/catalog to see available signals."
}
```

**Example:**

```bash
curl -H "sc-user-id: user-456" \
  http://localhost:3000/api/vehicles/vehicle-789/signals/BATTERY_LEVEL
```

---

### GET /api/vehicles/:vehicleId/signals-history

Get historical signal data from the local SQLite database. This returns cached signal snapshots collected from API calls and webhook events.

**Authentication:** Required (internal token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `signalCode` | string | No | Filter to a specific signal code. If omitted, returns the latest value for all signals. |
| `limit` | integer | No | Maximum number of records to return. Defaults to `100`. |

**Response (with signalCode filter):**

```json
{
  "data": [
    {
      "vehicle_id": "vehicle-789",
      "signal_code": "BATTERY_LEVEL",
      "value": "72.5",
      "data_age": "2025-01-15T12:00:00.000Z",
      "recorded_at": "2025-01-15T12:01:00.000Z"
    }
  ]
}
```

**Response (without signalCode -- latest values):**

```json
{
  "data": [
    {
      "vehicle_id": "vehicle-789",
      "signal_code": "BATTERY_LEVEL",
      "value": "72.5",
      "data_age": "2025-01-15T12:00:00.000Z",
      "recorded_at": "2025-01-15T12:01:00.000Z"
    },
    {
      "vehicle_id": "vehicle-789",
      "signal_code": "ODOMETER",
      "value": "15234.5",
      "data_age": "2025-01-15T12:00:00.000Z",
      "recorded_at": "2025-01-15T12:01:00.000Z"
    }
  ]
}
```

**Example:**

```bash
# Get history for a specific signal
curl "http://localhost:3000/api/vehicles/vehicle-789/signals-history?signalCode=BATTERY_LEVEL&limit=50"

# Get latest values for all signals
curl http://localhost:3000/api/vehicles/vehicle-789/signals-history
```

---

## Commands

All command endpoints require authentication and a user ID. The backend logs every command execution (success or failure) to SQLite with timing information.

**Required Headers for all command endpoints:**

| Header | Description |
|--------|-------------|
| `sc-user-id` | The Smartcar user ID that owns the vehicle. Can also be passed as a `userId` query parameter. |

### POST /api/vehicles/:vehicleId/commands/charge/start

Start charging the vehicle.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Request Body:** None

**Example:**

```bash
curl -X POST \
  -H "sc-user-id: user-456" \
  http://localhost:3000/api/vehicles/vehicle-789/commands/charge/start
```

---

### POST /api/vehicles/:vehicleId/commands/charge/stop

Stop charging the vehicle.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Request Body:** None

**Example:**

```bash
curl -X POST \
  -H "sc-user-id: user-456" \
  http://localhost:3000/api/vehicles/vehicle-789/commands/charge/stop
```

---

### POST /api/vehicles/:vehicleId/commands/charge/set-limit

Set the charge limit percentage. Validates that the percent value is between 0 and 100.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Request Body (Smartcar format):**

```json
{
  "data": {
    "attributes": {
      "percent": 80
    }
  }
}
```

**Request Body (shorthand format):**

```json
{
  "percent": 80
}
```

**Error Response (invalid value):**

```json
{
  "error": "Invalid charge limit",
  "message": "Provide a percent value between 0 and 100."
}
```

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "sc-user-id: user-456" \
  -d '{"percent": 80}' \
  http://localhost:3000/api/vehicles/vehicle-789/commands/charge/set-limit
```

---

### POST /api/vehicles/:vehicleId/commands/security/lock

Lock the vehicle doors.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Request Body:** None

**Example:**

```bash
curl -X POST \
  -H "sc-user-id: user-456" \
  http://localhost:3000/api/vehicles/vehicle-789/commands/security/lock
```

---

### POST /api/vehicles/:vehicleId/commands/security/unlock

Unlock the vehicle doors.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Request Body:** None

**Example:**

```bash
curl -X POST \
  -H "sc-user-id: user-456" \
  http://localhost:3000/api/vehicles/vehicle-789/commands/security/unlock
```

---

### POST /api/vehicles/:vehicleId/commands/navigation/set-destination

Set a navigation destination. Validates that latitude is between -90 and 90, and longitude is between -180 and 180.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Request Body (Smartcar format):**

```json
{
  "data": {
    "attributes": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }
}
```

**Request Body (shorthand format):**

```json
{
  "latitude": 37.7749,
  "longitude": -122.4194
}
```

**Error Response (missing coordinates):**

```json
{
  "error": "Invalid destination",
  "message": "Provide latitude and longitude."
}
```

**Error Response (out of range):**

```json
{
  "error": "Invalid coordinates",
  "message": "Latitude must be -90 to 90, longitude must be -180 to 180."
}
```

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "sc-user-id: user-456" \
  -d '{"data":{"attributes":{"latitude":37.7749,"longitude":-122.4194}}}' \
  http://localhost:3000/api/vehicles/vehicle-789/commands/navigation/set-destination
```

---

### POST /api/vehicles/:vehicleId/charge-schedules/daily

Set a daily charge schedule for the vehicle.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Request Body:** The schedule object as defined by the Smartcar API.

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "sc-user-id: user-456" \
  -d '{"startTime":"22:00","endTime":"06:00"}' \
  http://localhost:3000/api/vehicles/vehicle-789/charge-schedules/daily
```

---

### POST /api/vehicles/:vehicleId/charge-schedules/weekly

Set a weekly charge schedule for the vehicle.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Request Body:** The weekly schedule object as defined by the Smartcar API.

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "sc-user-id: user-456" \
  -d '{"monday":{"startTime":"22:00","endTime":"06:00"},"tuesday":{"startTime":"22:00","endTime":"06:00"}}' \
  http://localhost:3000/api/vehicles/vehicle-789/charge-schedules/weekly
```

---

### POST /api/vehicles/:vehicleId/charge-schedules/workweek

Set a workweek (Monday-Friday) charge schedule for the vehicle.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Request Body:** The workweek schedule object as defined by the Smartcar API.

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "sc-user-id: user-456" \
  -d '{"startTime":"22:00","endTime":"06:00"}' \
  http://localhost:3000/api/vehicles/vehicle-789/charge-schedules/workweek
```

---

### DELETE /api/vehicles/:vehicleId/charge-schedules/:scheduleId

Delete a charge schedule.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |
| `scheduleId` | string | The schedule ID to delete. |

**Example:**

```bash
curl -X DELETE \
  -H "sc-user-id: user-456" \
  http://localhost:3000/api/vehicles/vehicle-789/charge-schedules/schedule-abc
```

---

### GET /api/vehicles/:vehicleId/command-logs

Get the command execution history for a vehicle from the local SQLite database. Includes both successful and failed commands with timing data.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vehicleId` | string | The Smartcar vehicle ID. |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Maximum number of records. Defaults to `50`. |
| `offset` | integer | No | Number of records to skip. Defaults to `0`. |

**Response:**

```json
{
  "data": [
    {
      "vehicle_id": "vehicle-789",
      "user_id": "user-456",
      "command_type": "charge/start",
      "status": "SUCCESS",
      "request_body": null,
      "response_body": "{...}",
      "duration_ms": 1234,
      "executed_at": "2025-01-15T12:00:00.000Z"
    }
  ]
}
```

**Example:**

```bash
curl -H "sc-user-id: user-456" \
  "http://localhost:3000/api/vehicles/vehicle-789/command-logs?limit=20"
```

---

## Webhooks

### POST /webhooks/receive

Main webhook receiver endpoint. Smartcar sends events here when vehicle data changes. The payload signature is verified using the `SC-Signature` header and the `SMARTCAR_APP_MANAGEMENT_TOKEN` (HMAC-SHA256).

**Authentication:** Verified via `SC-Signature` header (HMAC-SHA256 signature).

**Required Headers:**

| Header | Description |
|--------|-------------|
| `SC-Signature` | HMAC-SHA256 hex digest of the request body, signed with the App Management Token. |

**Handled Event Types:**

| Event Type | Description |
|------------|-------------|
| `VERIFY` | Smartcar endpoint verification challenge. Returns the challenge value. |
| `VEHICLE_STATE` | Vehicle signal data update. Signals are stored in SQLite. |
| `VEHICLE_ERROR` | Vehicle error event. Logged and stored. |

**Response (VERIFY):**

```json
{
  "challenge": "challenge-value-from-smartcar"
}
```

**Response (VEHICLE_STATE / VEHICLE_ERROR):**

```json
{
  "status": "received"
}
```

**Note:** This endpoint is called by Smartcar's servers, not directly by your application. Use ngrok or a similar tunnel to expose it during development.

---

### GET /api/webhooks

List all configured webhooks from the Smartcar Management API.

**Authentication:** Required (internal token)

**Example:**

```bash
curl http://localhost:3000/api/webhooks
```

---

### GET /api/webhooks/:webhookId

Get details for a specific webhook.

**Authentication:** Required (internal token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhookId` | string | The webhook ID. |

**Example:**

```bash
curl http://localhost:3000/api/webhooks/webhook-abc
```

---

### GET /api/subscriptions

List webhook subscriptions with optional filters.

**Authentication:** Required (internal token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhookId` | string | No | Filter by webhook ID. |
| `vehicleId` | string | No | Filter by vehicle ID. |
| `userId` | string | No | Filter by user ID. |
| `page` | integer | No | Page number for pagination. |
| `size` | integer | No | Page size for pagination. |

**Example:**

```bash
curl "http://localhost:3000/api/subscriptions?webhookId=webhook-abc"
```

---

### POST /api/subscriptions

Create a new webhook subscription for a vehicle.

**Authentication:** Required (internal token)

**Request Body:**

```json
{
  "webhookId": "webhook-abc",
  "userId": "user-456",
  "vehicleId": "vehicle-789"
}
```

All three fields are required.

**Error Response (missing fields):**

```json
{
  "error": "Missing required fields",
  "message": "Provide webhookId, userId, and vehicleId."
}
```

**Response:** HTTP 201 Created with the subscription data.

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"webhookId":"webhook-abc","userId":"user-456","vehicleId":"vehicle-789"}' \
  http://localhost:3000/api/subscriptions
```

---

### GET /api/subscriptions/:subscriptionId

Get details for a specific subscription.

**Authentication:** Required (internal token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `subscriptionId` | string | The subscription ID. |

**Example:**

```bash
curl http://localhost:3000/api/subscriptions/sub-123
```

---

### DELETE /api/subscriptions/:subscriptionId

Remove a webhook subscription.

**Authentication:** Required (internal token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `subscriptionId` | string | The subscription ID to remove. |

**Response:** HTTP 204 No Content

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/subscriptions/sub-123
```

---

### GET /api/webhook-events

List received webhook events stored in the local SQLite database. No authentication required.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Maximum number of events. Defaults to `50`. |
| `offset` | integer | No | Number of events to skip. Defaults to `0`. |
| `eventType` | string | No | Filter by event type (e.g., `VEHICLE_STATE`, `VEHICLE_ERROR`, `VERIFY`). |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "event_id": "evt-abc",
      "event_type": "VEHICLE_STATE",
      "vehicle_id": "vehicle-789",
      "payload": "{...}",
      "received_at": "2025-01-15T12:00:00.000Z"
    }
  ]
}
```

**Example:**

```bash
# Get the latest 20 events
curl "http://localhost:3000/api/webhook-events?limit=20"

# Filter by event type
curl "http://localhost:3000/api/webhook-events?eventType=VEHICLE_STATE"
```

---

## Compatibility

These endpoints check which vehicles are compatible with Smartcar. Results are cached for 24 hours. No authentication is required.

### GET /api/compatibility

Get a list of compatible vehicles with optional filters.

**Authentication:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `region` | string | No | Filter by region (e.g., `US`, `EU`). |
| `make` | string | No | Filter by vehicle make (e.g., `TESLA`, `BMW`, `MG`). |
| `powertrainType` | string | No | Filter by powertrain type (e.g., `BEV`, `PHEV`, `ICE`). |

**Example:**

```bash
curl "http://localhost:3000/api/compatibility?make=TESLA&powertrainType=BEV"
```

---

### GET /api/compatibility/mg

Pre-filtered compatibility check for MG brand battery electric vehicles (BEV).

**Authentication:** None

**Example:**

```bash
curl http://localhost:3000/api/compatibility/mg
```

---

### POST /api/compatibility/clear-cache

Clear the 24-hour compatibility results cache. Use this after updating your Smartcar application permissions.

**Authentication:** None

**Response:**

```json
{
  "status": "cache cleared"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/compatibility/clear-cache
```

---

## Management

These endpoints proxy the Smartcar Management API. All require authentication.

### GET /api/management/applications

List all applications associated with the configured Smartcar credentials.

**Authentication:** Required (internal token)

**Example:**

```bash
curl http://localhost:3000/api/management/applications
```

---

### GET /api/management/applications/:id

Get details for a specific application.

**Authentication:** Required (internal token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The application ID. |

**Example:**

```bash
curl http://localhost:3000/api/management/applications/app-abc
```

---

### GET /api/management/applications/:id/secrets

Get secrets for a specific application.

**Authentication:** Required (internal token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The application ID. |

**Example:**

```bash
curl http://localhost:3000/api/management/applications/app-abc/secrets
```

---

## Quick Reference

| Method | Path | Auth | User ID | Description |
|--------|------|------|---------|-------------|
| GET | `/health` | No | No | Health check |
| GET | `/auth/connect` | No | No | Redirect to Smartcar Connect |
| GET | `/auth/callback` | No | No | OAuth callback handler |
| GET | `/auth/status` | No | No | Auth status and connected users |
| POST | `/auth/token` | No | No | Force token refresh |
| GET | `/auth/token` | No | No | Current token info |
| GET | `/api/connections` | Yes | No | List connections |
| GET | `/api/connections/:connectionId` | Yes | No | Get connection |
| DELETE | `/api/connections/:connectionId` | Yes | No | Remove connection |
| DELETE | `/api/connections/users/:userId` | Yes | No | Remove user and connections |
| GET | `/api/vehicles/signals/catalog` | No | No | Signal codes catalog |
| GET | `/api/vehicles/:vehicleId` | Yes | No | Get vehicle attributes |
| GET | `/api/vehicles/:vehicleId/signals` | Yes | Yes | Get all signals |
| GET | `/api/vehicles/:vehicleId/signals/:signalCode` | Yes | Yes | Get specific signal |
| GET | `/api/vehicles/:vehicleId/signals-history` | Yes | No | Signal history (SQLite) |
| POST | `/api/vehicles/:vehicleId/commands/charge/start` | Yes | Yes | Start charging |
| POST | `/api/vehicles/:vehicleId/commands/charge/stop` | Yes | Yes | Stop charging |
| POST | `/api/vehicles/:vehicleId/commands/charge/set-limit` | Yes | Yes | Set charge limit |
| POST | `/api/vehicles/:vehicleId/commands/security/lock` | Yes | Yes | Lock doors |
| POST | `/api/vehicles/:vehicleId/commands/security/unlock` | Yes | Yes | Unlock doors |
| POST | `/api/vehicles/:vehicleId/commands/navigation/set-destination` | Yes | Yes | Set navigation destination |
| POST | `/api/vehicles/:vehicleId/charge-schedules/daily` | Yes | Yes | Set daily charge schedule |
| POST | `/api/vehicles/:vehicleId/charge-schedules/weekly` | Yes | Yes | Set weekly charge schedule |
| POST | `/api/vehicles/:vehicleId/charge-schedules/workweek` | Yes | Yes | Set workweek charge schedule |
| DELETE | `/api/vehicles/:vehicleId/charge-schedules/:scheduleId` | Yes | Yes | Delete charge schedule |
| GET | `/api/vehicles/:vehicleId/command-logs` | Yes | Yes | Command history (SQLite) |
| POST | `/webhooks/receive` | Signature | No | Webhook receiver |
| GET | `/api/webhooks` | Yes | No | List webhooks |
| GET | `/api/webhooks/:webhookId` | Yes | No | Get webhook details |
| GET | `/api/subscriptions` | Yes | No | List subscriptions |
| POST | `/api/subscriptions` | Yes | No | Create subscription |
| GET | `/api/subscriptions/:subscriptionId` | Yes | No | Get subscription |
| DELETE | `/api/subscriptions/:subscriptionId` | Yes | No | Remove subscription |
| GET | `/api/webhook-events` | No | No | List received events (SQLite) |
| GET | `/api/compatibility` | No | No | Compatible vehicles |
| GET | `/api/compatibility/mg` | No | No | MG BEV compatibility |
| POST | `/api/compatibility/clear-cache` | No | No | Clear compatibility cache |
| GET | `/api/management/applications` | Yes | No | List applications |
| GET | `/api/management/applications/:id` | Yes | No | Application details |
| GET | `/api/management/applications/:id/secrets` | Yes | No | Application secrets |
| POST | `/api/saic/account` | No | No | Connect SAIC account (rate-limited: 5/15min) |
| GET | `/api/saic/account` | No | No | SAIC account status |
| DELETE | `/api/saic/account` | No | No | Disconnect SAIC account |
| GET | `/api/saic/vehicles` | SAIC token | No | List SAIC vehicles |
| GET | `/api/saic/vehicles/:vin/status` | SAIC token | No | Vehicle status (rate-limited when refresh=true) |
| GET | `/api/saic/vehicles/:vin/charging` | SAIC token | No | Charging data (rate-limited when refresh=true) |
| GET | `/api/saic/vehicles/:vin/signals` | SAIC token | No | Normalized signals (rate-limited when refresh=true) |
| GET | `/api/saic/vehicles/:vin/history` | No | No | Snapshot history (SQLite) |
| GET | `/api/saic/messages` | SAIC token | No | Alarm/command/news messages |
| POST | `/api/saic/vehicles/:vin/commands/:command` | SAIC token | No | Execute SAIC command (rate-limited: 10/min) |
| GET | `/api/saic/vehicles/:vin/commands` | No | No | SAIC command history (SQLite) |
