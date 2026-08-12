# SAIC / MG iSmart Direct Integration

A self-contained module inside the existing backend that communicates directly with the SAIC iSmart API, bypassing Smartcar. Built for Israeli MG4 accounts that Smartcar cannot broker (see below), but works with any supported SAIC region.

---

## Why Not Smartcar?

Smartcar brokers MG/SAIC by logging into the iSmart backend on your behalf. The country selector picks the SAIC tenant/region context. An Israeli iSmart account is provisioned on a regional gateway (`gateway-mg-il.soimt.com`) under a tenant that Smartcar does not offer. Choosing Germany or the Netherlands makes Smartcar authenticate against the EU gateway with the wrong context, which surfaces as "wrong credentials".

**Israel is not in Smartcar's supported market list for MG/SAIC.** The reverse-engineered API is the right path.

---

## Setup

### 1. Environment Variables

Add the following to `backend/.env`:

```env
# Required: encryption key for stored SAIC credentials (AES-256-GCM).
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# WARNING: Loss of this key makes stored credentials unrecoverable.
SAIC_CREDENTIALS_KEY=<your-random-hex-key>

# Region code (default: il)
# Supported: eu, au, tr, il, br, in, th, cn
SAIC_REGION=il

# Vehicle status poll interval in ms (default: 30000)
# Aggressive polling drains the 12V battery — do not lower without good reason.
SAIC_POLL_INTERVAL_MS=30000
```

### 2. Connect Your Account

**Via UI:** Navigate to SAIC Connect (toggle to SAIC provider in the sidebar), enter your iSmart email/phone and password, select your region.

**Via CLI:**
```bash
smartcar saic login --username your@email.com --password yourpassword --region il
```

**Via API:**
```bash
curl -X POST http://localhost:3000/api/saic/account \
  -H 'Content-Type: application/json' \
  -d '{"username": "your@email.com", "password": "yourpassword", "region": "il"}'
```

### 3. Use the Dashboard

Toggle to SAIC mode in the sidebar. The SAIC dashboard shows battery, charging, lock status, climate controls, location, tyre pressures, and command history.

---

## Supported Regions

| Region | Code | Gateway | Status |
|--------|------|---------|--------|
| EU | `eu` | `gateway-mg-eu.soimt.com` | Confirmed |
| Australia | `au` | `gateway-mg-au.soimt.com` | Confirmed |
| Turkey | `tr` | `gateway-mg-tr.soimt.com` | Confirmed |
| **Israel** | `il` | `gateway-mg-il.soimt.com` | **Confirmed (live-tested)** |
| Brazil | `br` | `gateway-mg-br.soimt.com` | Confirmed |
| India | `in` | `gateway-mg-in.soimt.com` | Unverified |
| Thailand | `th` | `gateway-mg-th.soimt.com` | Unverified |
| China | `cn` | `tap-cn.soimt.com` | Confirmed |

---

## API Endpoints

All endpoints are under `/api/saic/`.

### Account

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/saic/account` | Save credentials and validate login |
| GET | `/api/saic/account` | Account status (never returns password) |
| DELETE | `/api/saic/account` | Remove account and all SAIC data |

### Vehicles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/saic/vehicles` | List vehicles |
| GET | `/api/saic/vehicles/:vin/status` | Vehicle status (`?refresh=true` for live) |
| GET | `/api/saic/vehicles/:vin/charging` | Charging data (`?refresh=true` for live) |
| GET | `/api/saic/vehicles/:vin/signals` | Normalized signal view |
| GET | `/api/saic/vehicles/:vin/history` | Snapshot history (`?field=...`) |

### Commands

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/saic/vehicles/:vin/commands/:command` | Execute a command |
| GET | `/api/saic/vehicles/:vin/commands` | Command history |

Available commands: `findVehicle`, `lock`, `unlock`, `startClimate`, `stopClimate`, `heatedSeats`, `rearWindowHeat`, `startCharging`, `stopCharging`, `setChargeLimit`, `setChargeCurrent`, `batteryHeating`.

### Messages

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/saic/messages` | Alarm/command/news messages |

---

## Rate Limiting

The following rate limits are enforced server-side to protect the vehicle and account:

| Endpoint | Limit | Window | Reason |
|----------|-------|--------|--------|
| `POST /api/saic/account` | 5 requests | 15 minutes | Prevent brute-force login |
| `GET .../status?refresh=true` | 6 requests | 5 minutes | Protect 12V battery |
| `GET .../charging?refresh=true` | 6 requests | 5 minutes | Protect 12V battery |
| `GET .../signals?refresh=true` | 6 requests | 5 minutes | Protect 12V battery |
| `POST .../commands/:command` | 10 requests | 1 minute | Prevent command flooding |

Cached reads (without `?refresh=true`) are not rate-limited.

---

## Important Notes

### Battery Protection

**The 12V auxiliary battery is the most critical constraint.** Live refresh requests wake the vehicle's telematics unit. Frequent polling will drain the 12V battery and can leave the car unable to start.

- Default to cached reads. Only use `?refresh=true` when you need fresh data.
- The recommended polling intervals (from the SAIC MQTT gateway):
  - Active/driving: 30s
  - After shutdown: 120s for 10 minutes, then 24h
  - Charging: dynamic based on power draw

### Session Conflicts

Logging in via the API creates a new session and **may invalidate your iSmart phone app session** (and vice versa). This is expected behavior from the SAIC backend. If you notice the phone app logged out, simply re-open it.

### TLS Certificate

The SAIC gateway uses a certificate chain that includes a CA not in the default Node.js trust store. For development, set `NODE_TLS_REJECT_UNAUTHORIZED=0`. For production, bundle the CA certificate.

### Terms of Service

This integration accesses the user's own vehicle with the user's own credentials via the reverse-engineered SAIC iSmart API. It is based on community research from the [SAIC-iSmart-API](https://github.com/SAIC-iSmart-API) project. The API is unofficial and may change without notice.

---

## Troubleshooting

### "Wrong credentials" on login
- Verify your email/phone and password are correct for the iSmart app
- Check the region code matches where your account was registered
- The password is SHA-1 hashed before sending (handled automatically)

### "Vehicle is asleep" (504)
- The vehicle did not respond within the polling timeout (30s)
- Try again later, or wait until the car wakes up (door open, charging start, etc.)
- Do NOT spam refresh requests — this will drain the 12V battery

### "Too many requests" (429)
- Rate limiting is active. Wait for the window to reset.
- Check the `Retry-After` header in the response.

### Token expired
- Tokens auto-renew on next request. If login fails, check your credentials.
- Israel tokens are valid for ~180 days; EU tokens for ~2 hours.

### iSmart app logged out
- Normal behavior. The SAIC backend supports one active session. API login invalidates the app session.

---

## Upstream References

- [saic-python-client-ng](https://github.com/SAIC-iSmart-API/saic-python-client-ng) — primary protocol reference
- [saic-python-mqtt-gateway](https://github.com/SAIC-iSmart-API/saic-python-mqtt-gateway) — operational discipline, polling intervals
- [Protocol specification](./SAIC-PROTOCOL.md) — full protocol details captured during implementation
