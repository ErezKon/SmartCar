# SAIC iSmart API Protocol Specification

Produced by Sub-Plan A of `docs/Plans/2.SAIC.md`.
Source: `saic-python-client-ng` (primary), `saic-python-mqtt-gateway` (operational discipline), `mg-saic-ha` (region database).

---

## 1. Region / Gateway Map

| Region   | Base URI                                              | Region Header | Tenant ID | Status       |
|----------|-------------------------------------------------------|---------------|-----------|--------------|
| EU       | `https://gateway-mg-eu.soimt.com/api.app/v1/`         | `eu`          | `459771`  | Confirmed    |
| Australia| `https://gateway-mg-au.soimt.com/api.app/v1/`         | `au`          | `459771`  | Confirmed    |
| Turkey   | `https://gateway-mg-tr.soimt.com/api.app/v1/`         | `tr`          | `459771`  | Confirmed    |
| **Israel** | **`https://gateway-mg-il.soimt.com/api.app/v1/`**   | **`il`**      | `459771`  | **Confirmed (live login + vehicle list 2026-08-12)** |
| Brazil   | `https://gateway-mg-br.soimt.com/api.app/v1/`         | `br`          | `459771`  | Confirmed    |
| India    | `https://gateway-mg-in.soimt.com/api.app/v1/`         | `in`          | `459771`  | Unverified   |
| Thailand | `https://gateway-mg-th.soimt.com/api.app/v1/`         | `th`          | `459771`  | Unverified   |
| China    | `https://tap-cn.soimt.com/api.app/v1/`                | `cn`          | `459771`  | Confirmed    |

**API path prefix:** all endpoints below are relative to the base URI (e.g. `https://gateway-mg-il.soimt.com/api.app/v1/`).

**Israel finding:** Confirmed working on 2026-08-12. Live login succeeded against `gateway-mg-il.soimt.com` with email auth. Vehicle list returned one vehicle:
- VIN: `LSJWH4091TN019736`, MG4 Electric, 2025, series `EH32MY25 S`
- Token expiry: 15,551,999 seconds (~180 days, significantly longer than EU's typical 2h)
- Notable config: no sunroof (S35=0), has remote control (S61=1), has AC (T11=1)
- **TLS note:** the gateway's certificate chain includes a CA not in the default Node.js trust store. Must use `NODE_TLS_REJECT_UNAUTHORIZED=0` or add the CA cert. The Python client (httpx) handles this transparently.

---

## 2. Authentication

### 2.1 Login Endpoint

| Field         | Value                                          |
|---------------|------------------------------------------------|
| **Endpoint**  | `POST /oauth/token`                            |
| **Content-Type** | `application/x-www-form-urlencoded`         |
| **Auth Header** | `Authorization: Basic c3dvcmQ6c3dvcmRfc2VjcmV0` (base64 of `sword:sword_secret`) |

### 2.2 Login Request Body (form-encoded)

| Field         | Value / Notes                                                     |
|---------------|-------------------------------------------------------------------|
| `grant_type`  | `password`                                                        |
| `username`    | User's email or phone number                                      |
| `password`    | **SHA-1 hex digest** of the plaintext password (NOT plaintext!)   |
| `scope`       | `all`                                                             |
| `deviceId`    | `simulator*********************************************{unix_ts}###com.saicmotor.europecar` (pad with `*` to reach 50 chars before the timestamp) |
| `deviceType`  | `0` (iOS), `2` for Huawei                                        |
| `language`    | `EN`                                                              |
| `loginType`   | `2` if email login; `1` if phone login                            |
| `countryCode` | Phone country code (e.g. `+972` for Israel) - only when `loginType=1` |

### 2.3 Login Response (JSON, inside encrypted envelope)

```json
{
  "code": 0,
  "data": {
    "access_token": "eyJhbGciOiJIUz...",
    "refresh_token": "...",
    "expires_in": 7200,
    "token_type": "bearer",
    "tenant_id": "459771",
    "user_id": "...",
    "user_name": "...",
    "account": "user@example.com",
    "scope": "all",
    "client_id": "...",
    "role_id": "...",
    "role_name": "...",
    "dept_id": "...",
    "post_id": "...",
    "oauth_id": "...",
    "jti": "...",
    "detail": { "languageType": "en" }
  }
}
```

### 2.4 Token Usage

- The `access_token` is sent in the `blade-auth` header on all subsequent requests.
- Token expires after `expires_in` seconds (typically 7200 = 2 hours).
- No explicit refresh endpoint found in the client; the client simply re-logins when the token expires.
- **Multi-session warning:** logging in via the API creates a new session and may invalidate the phone app's session (and vice versa). This is expected behavior.

---

## 3. Encryption Scheme (Full Detail)

This is the highest-risk item for the TypeScript port. Every request body and response body is encrypted at the application layer.

### 3.1 Cipher

| Property   | Value                          |
|------------|--------------------------------|
| Algorithm  | **AES-128-CBC**                |
| Padding    | PKCS5/PKCS7                    |
| Key format | Hex string (32 hex chars = 16 bytes) derived via MD5 |
| IV format  | Hex string (32 hex chars = 16 bytes) derived via MD5 |
| Encoding   | Ciphertext is **hex-encoded** (not base64) |

### 3.2 Key / IV Derivation

All inputs are UTF-8 strings. The helper `md5_hex_digest(input, do_padding=false)` computes `MD5(input.encode('utf-8')).hex()` (lowercase hex, 32 chars).

#### Request encryption

```
request_path  = full URL minus base_uri, prefixed with "/" (e.g. "/vehicle/status?vin=abc123")
current_ts    = str(int(Date.now()))  // milliseconds since epoch as a string
tenant_id     = "459771"
user_token    = access_token or "" (empty before login)
content_type  = normalized content type (see 3.4)

key_part_one  = md5(request_path + tenant_id + user_token + "app")
key           = md5(key_part_one + current_ts + "1" + content_type)
iv            = md5(current_ts)

encrypted_body = hex(AES-128-CBC-PKCS5(plaintext_body, unhex(key), unhex(iv)))
```

#### Response decryption

```
app_send_date    = response header "APP-SEND-DATE" (ms timestamp string)
content_type     = response header "ORIGINAL-CONTENT-TYPE"

key = md5(app_send_date + "1" + content_type)
iv  = md5(app_send_date)

plaintext = AES-128-CBC-PKCS5-decrypt(unhex(response_body), unhex(key), unhex(iv))
```

**Key difference:** Response key derivation is simpler than request key derivation - it does NOT include the request path, tenant ID, or user token. It uses only `app_send_date + "1" + content_type`.

### 3.3 Verification String (HMAC)

Every request includes an `APP-VERIFICATION-STRING` header, which is an HMAC-SHA256:

```
hmac_input = request_path + tenant_id + user_token + "app"
           + current_ts + "1" + content_type
           + encrypted_body  // hex-encoded ciphertext, or "" if no body

hmac_key   = md5(key + current_ts)   // where key is the AES key from above

verification = HMAC-SHA256(hmac_key.encode(), hmac_input.encode()).hexdigest()
```

### 3.4 Content-Type Normalization

The `normalize_content_type` function maps:
- `application/x-www-form-urlencoded` -> `application/x-www-form-urlencoded`
- `multipart/*` -> `multipart/form-data` (not encrypted)
- Everything else (including `application/json`) -> `application/json`

Multipart bodies are NOT encrypted.

### 3.5 Known-Good Test Vectors

From `tests/security_test.py`:

**Vector 1:**
```
Input:
  request_path = "/api/v1/data"
  current_ts   = "20230514123000"
  tenant_id    = "1234"
  content_type = "application/json"
  request_content = '{"key": "value"}'
  user_token   = "dummy_token"

Expected APP-VERIFICATION-STRING:
  "afd4eaf98af2d964f8ea840fc144ee7bae95dbeeeb251d5e3a01371442f92eeb"
```

**Vector 2 (empty path):**
```
Input:
  request_path = ""
  (same other params as Vector 1)

Expected: "ff8cb13ebcce5958e7fbfe602716c653fd72ce78842be87b6d50dccede198735"
```

**Vector 3 (no content):**
```
Input:
  request_path = "/api/v1/data"
  request_content = ""
  (same other params as Vector 1)

Expected: "332c85836aa9afc864282436a740eb2cc778fafd1fea74dd887c1f8de5056de0"
```

**Round-trip test:** encrypt a JSON body, then decrypt it, and the result must equal the original. This is verified in `test_a_request_should_decrypt_properly`.

---

## 4. Required HTTP Headers

Every encrypted request includes these headers:

| Header                     | Value                                          | Notes                    |
|----------------------------|------------------------------------------------|--------------------------|
| `User-Agent`               | `Europe/2.1.0 (iPad; iOS 18.5; Scale/2.00)`   | Static string            |
| `Content-Type`             | `{normalized_content_type};charset=utf-8`      |                          |
| `Accept`                   | `application/json`                             |                          |
| `Accept-Encoding`          | `gzip`                                         |                          |
| `REGION`                   | Region code (e.g. `il`, `eu`)                  |                          |
| `APP-SEND-DATE`            | Millisecond timestamp as string                |                          |
| `APP-CONTENT-ENCRYPTED`    | `1`                                            | Always "1"               |
| `tenant-id`                | `459771`                                       | Case-sensitive lowercase |
| `User-Type`                | `app`                                          |                          |
| `APP-LANGUAGE-TYPE`        | `en`                                           |                          |
| `blade-auth`               | Access token                                   | Omitted before login     |
| `APP-VERIFICATION-STRING`  | HMAC-SHA256 hex digest                         | See section 3.3          |
| `ORIGINAL-CONTENT-TYPE`    | Normalized content type                        |                          |

---

## 5. API Endpoints

### 5.1 Vehicle List

| Field      | Value                     |
|------------|---------------------------|
| Method     | `GET`                     |
| Path       | `/vehicle/list`           |
| Auth       | Required (blade-auth)     |
| Event-ID   | No                        |
| PIN        | No                        |

**Response `data`:**
```typescript
interface VehicleListResp {
  vinList: VinInfo[];
}

interface VinInfo {
  vin: string;
  brandName: string;
  modelName: string;
  modelYear: string;
  colorName: string;
  series: string;          // e.g. "EH32" for MG4
  name: string;            // user-assigned name
  isActivate: boolean;
  isCurrentVehicle: boolean;
  bindTime: number;        // epoch ms
  vehicleModelConfiguration: VehicleModelConfiguration[];
}

interface VehicleModelConfiguration {
  itemCode: string;
  itemName: string;
  itemValue: string;
}
```

### 5.2 Vehicle Status (async, event-id polling)

| Field      | Value                                                |
|------------|------------------------------------------------------|
| Method     | `GET`                                                |
| Path       | `/vehicle/status`                                    |
| Params     | `vin={sha256(VIN)}`, `vehStatusReqType=2`            |
| Auth       | Required                                             |
| Event-ID   | **Yes** (initial `event-id: 0`, then poll with returned event-id) |
| PIN        | No                                                   |

**VIN hashing:** All endpoints that take a VIN parameter send `SHA-256(VIN)` hex digest, NOT the raw VIN.

**Response `data`:**
```typescript
interface VehicleStatusResp {
  basicVehicleStatus: BasicVehicleStatus;
  gpsPosition: GpsPosition;
  statusTime: number;     // epoch ms
}

interface BasicVehicleStatus {
  batteryVoltage: number;     // 12V battery, raw value
  bonnetStatus: number;       // 0=closed, 1=open
  bootStatus: number;
  canBusActive: number;
  driverDoor: number;         // 0=closed, 1=open
  passengerDoor: number;
  rearLeftDoor: number;
  rearRightDoor: number;
  driverWindow: number;
  passengerWindow: number;
  rearLeftWindow: number;
  rearRightWindow: number;
  lockStatus: number;         // 0=unlocked, 1=locked
  engineStatus: number;       // 0=off, 1=running
  handBrake: number;
  exteriorTemperature: number;
  interiorTemperature: number;
  mileage: number;            // raw (multiply by 0.1 for km)
  fuelRangeElec: number;      // electric range, raw (multiply by 0.1 for km)
  remoteClimateStatus: number;
  frontLeftTyrePressure: number;   // multiply by 0.04 for bar
  frontRightTyrePressure: number;
  rearLeftTyrePressure: number;
  rearRightTyrePressure: number;
  sunroofStatus: number;
  frontLeftSeatHeatLevel: number;
  frontRightSeatHeatLevel: number;
  powerMode: number;
  vehicleAlarmStatus: number;
  // ... (see BasicVehicleStatus in schema.py for all fields)
}

interface GpsPosition {
  gpsStatus: number;     // 0=no signal, 1=time fix, 2=2D, 3=3D
  timeStamp: number;
  wayPoint: {
    heading: number;
    speed: number;
    hdop: number;
    satellites: number;
    position: {
      latitude: number;    // raw integer, divide by 1000000 for degrees
      longitude: number;
      altitude: number;
    };
  };
}
```

### 5.3 Charging Management Data (async, event-id polling)

| Field      | Value                                       |
|------------|---------------------------------------------|
| Method     | `GET`                                       |
| Path       | `/vehicle/charging/mgmtData`                |
| Params     | `vin={sha256(VIN)}`                         |
| Auth       | Required                                    |
| Event-ID   | **Yes**                                     |
| PIN        | No                                          |

**Response `data`:**
```typescript
interface ChrgMgmtDataResp {
  chrgMgmtData: ChrgMgmtData;
  rvsChargeStatus: RvsChargeStatus;
}

interface ChrgMgmtData {
  bmsPackSOCDsp: number;          // SOC percentage * 10
  bmsPackCrnt: number;            // decoded: value * 0.05 - 1000.0 (amps)
  bmsPackVol: number;             // decoded: value * 0.25 (volts)
  bmsEstdElecRng: number;         // estimated electric range (km)
  bmsChrgSts: number;             // BMS charging status code (see enum below)
  bmsOnBdChrgTrgtSOCDspCmd: number;  // target SOC code (1=40%, 2=50%, ..., 7=100%)
  bmsAltngChrgCrntDspCmd: number;    // charge current limit code (1=6A, 2=8A, 3=16A, 4=Max)
  chrgngRmnngTime: number;        // remaining charging time (minutes)
  chrgngRmnngTimeV: number;       // validity flag
  ccuEleccLckCtrlDspCmd: number;  // charging port lock (1=locked)
  bmsPTCHeatReqDspCmd: number;    // battery heating (1=active)
  ccuOnbdChrgrPlugOn: number;     // on-board charger plugged in
  ccuOffBdChrgrPlugOn: number;    // off-board charger plugged in
  chrgngDoorPosSts: number;       // charging door position
  // ... (see ChrgMgmtData in schema.py for all ~40 fields)
}
```

**BMS Charging Status Codes:**

| Code | Meaning                   |
|------|---------------------------|
| 0    | Unplugged                 |
| 1    | Charging (AC)             |
| 2    | Charge done               |
| 3    | Charging                  |
| 4    | Charge fault              |
| 5    | Connecting                |
| 6    | Connected, not recognized |
| 7    | Connected, not charging   |
| 8    | Charging stopped          |
| 9    | Scheduled charging        |
| 10   | Charging (DC fast)        |
| 11   | Super off-board charging  |
| 12   | Charging                  |
| 13   | V2X discharging           |

### 5.4 Charging Status (async, event-id polling)

| Field      | Value                                       |
|------------|---------------------------------------------|
| Method     | `GET`                                       |
| Path       | `/vehicle/charging/status`                  |
| Params     | `vin={sha256(VIN)}`                         |
| Auth       | Required                                    |
| Event-ID   | **Yes**                                     |
| PIN        | No                                          |

Returns `ChargeStatusResp` with `chargingStatus` (current/voltage/duration/power/mileage fields) and `gpsPosition`.

### 5.5 Vehicle Control Command (async, event-id polling)

| Field      | Value                                       |
|------------|---------------------------------------------|
| Method     | `POST`                                      |
| Path       | `/vehicle/control`                          |
| Body       | JSON `VehicleControlReq`                    |
| Auth       | Required                                    |
| Event-ID   | **Yes** (1-second initial poll interval)    |
| PIN        | See command table below                     |

**Request body:**
```typescript
interface VehicleControlReq {
  vin: string;            // SHA-256 of VIN
  rvcReqType: string;     // command type code (see table)
  rvcParams: RvcParam[] | null;
}

interface RvcParam {
  paramId: number;
  paramValue: string;     // base64-encoded byte value
}
```

**Command types (`rvcReqType`):**

| Code | Command                | PIN Required | Notes |
|------|------------------------|--------------|-------|
| `0`  | Find My Car            | No           | Horn + lights |
| `1`  | Lock (close locks)     | No           | No params needed |
| `2`  | Unlock (open locks)    | **TBD**      | Requires `lockId` param (3=doors, 2=tailgate) |
| `3`  | Windows                | No           | Per-window open/close params |
| `5`  | Heated Seats           | No           | Left/right level (0-3) |
| `6`  | Climate/AC             | No           | Fan speed + temp index + AC on/off |
| `7`  | Air Clean              | No           | |
| `17` | Engine Control         | **TBD**      | |
| `18` | Remote Refresh         | No           | |
| `19` | Remote Immobilizer     | **TBD**      | |
| `32` | Rear Window Heat       | No           | Enable/disable |

### 5.6 Charging Control (async, event-id polling)

| Field      | Value                                       |
|------------|---------------------------------------------|
| Method     | `POST`                                      |
| Path       | `/vehicle/charging/control`                 |
| Body       | JSON `ChargingControlRequest`               |
| Auth       | Required                                    |
| Event-ID   | **Yes**                                     |
| PIN        | No                                          |

**Request body:**
```typescript
interface ChargingControlRequest {
  vin: string;                 // SHA-256 of VIN
  chrgCtrlReq: number;        // 0=no-op, 1=start charging, 2=stop charging
  tboxV2XReq: number;         // 0=no-op, 1=start V2X, 2=stop V2X
  tboxEleccLckCtrlReq: number; // 0=no-op, 1=lock port, 2=unlock port
}
```

### 5.7 Charging Settings (async, event-id polling)

| Field      | Value                                       |
|------------|---------------------------------------------|
| Method     | `POST`                                      |
| Path       | `/vehicle/charging/setting`                 |
| Body       | JSON `ChargingSettingRequest`               |
| Auth       | Required                                    |
| Event-ID   | **Yes**                                     |

**Request body:**
```typescript
interface ChargingSettingRequest {
  vin: string;
  onBdChrgTrgtSOCReq: number;   // target SOC code (0=ignore, 1=40%, ..., 7=100%)
  altngChrgCrntReq: number;     // charge current limit (0=ignore, 1=6A, 2=8A, 3=16A, 4=Max)
  tboxV2XSpSOCReq: number;      // V2X target SOC (0=ignore)
}
```

**Target SOC codes:**

| Code | Percentage |
|------|-----------|
| 0    | Ignore    |
| 1    | 40%       |
| 2    | 50%       |
| 3    | 60%       |
| 4    | 70%       |
| 5    | 80%       |
| 6    | 90%       |
| 7    | 100%      |

**Charge current limit codes:**

| Code | Limit  |
|------|--------|
| 0    | Ignore |
| 1    | 6A     |
| 2    | 8A     |
| 3    | 16A    |
| 4    | Max    |

### 5.8 Scheduled Charging (async, event-id polling)

| Field      | Value                                       |
|------------|---------------------------------------------|
| Method     | `POST`                                      |
| Path       | `/vehicle/charging/reservation`             |
| Body       | JSON `ScheduledChargingRequest`             |
| Auth       | Required                                    |
| Event-ID   | **Yes**                                     |

### 5.9 Battery Heating Schedule

| Field      | Value                                       |
|------------|---------------------------------------------|
| Method     | `GET` / `POST`                              |
| Path       | `/charging/batteryHeating`                  |
| Params/Body| `vin={sha256(VIN)}`; POST body has `startTime`, `status`, `vin` |
| Auth       | Required                                    |
| Event-ID   | No (GET); No (POST)                         |

### 5.10 Battery Heating Control (async, event-id polling)

| Field      | Value                                       |
|------------|---------------------------------------------|
| Method     | `POST`                                      |
| Path       | `/vehicle/charging/ptcHeat`                 |
| Body       | `{ ptcHeatReq: 1|2, vin: sha256(VIN) }`    |
| Auth       | Required                                    |
| Event-ID   | **Yes**                                     |

### 5.11 Alarm Switch

| Field      | Value                                       |
|------------|---------------------------------------------|
| Method     | `GET` / `PUT`                               |
| Path       | `/vehicle/alarmSwitch`                      |
| Auth       | Required                                    |
| Event-ID   | No                                          |

**Alarm types:** 0=Vehicle Fault, 2=Geofence, 3=Vehicle Start.

### 5.12 Messages

| Field      | Value                                         |
|------------|-----------------------------------------------|
| Method     | `GET`                                         |
| Path       | `/message/list`                               |
| Params     | `pageNum`, `pageSize`, `messageGroup` (ALARM/COMMAND/NEWS) |
| Auth       | Required                                      |
| Event-ID   | No                                            |

| Method     | `PUT`                                         |
|------------|-----------------------------------------------|
| Path       | `/message/status`                             |
| Body       | `{ actionType: "READ"|"DELETE"|"DELETE_ALARM"|"DELETE_COMMAND"|"DELETE_NEWS", messageId: ... }` |

| Method     | `GET`                                         |
|------------|-----------------------------------------------|
| Path       | `/message/unreadCount`                        |

**Message entity:**
```typescript
interface MessageEntity {
  messageId: string | number;
  messageType: string;
  title: string;
  content: string;
  messageTime: string;     // format varies: "YYYY-MM-DD HH:mm:ss" or "DD-MM-YYYY HH:mm:ss" or "DD/MM/YYYY HH:mm:ss"
  readStatus: number;      // 0=unread, 1=read
  sender: string;
  vin: string;
}
```

### 5.13 User Timezone

| Field      | Value                |
|------------|----------------------|
| Method     | `GET`                |
| Path       | `/user/timezone`     |
| Auth       | Required             |
| Event-ID   | No                   |

---

## 6. Async Event-ID Polling Contract

Many endpoints use an asynchronous polling pattern because the car must wake up from sleep to respond.

### Flow

1. **Initial request:** Send with header `event-id: 0`.
2. **Server response (not ready):** HTTP 200, JSON body with `code != 0`, and response header `event-id: {new_id}`. The `data` field is absent.
3. **Retry:** Re-send the same request with header `event-id: {new_id}`.
4. **Server response (ready):** HTTP 200, JSON body with `code: 0` and `data: { ... }`.

### Retry Policy

From the client library:
- **Max duration:** 30 seconds (`tenacity.stop_after_delay(30)`)
- **Default poll interval:** 3 seconds (`sms_delivery_delay` config, used as `wait_fixed`)
- **Vehicle control commands:** 1-second initial interval (`wait_chain(wait_fixed(1) + wait_none())`)
- **Retry condition:** Only retry on `SaicApiRetryException` (code != 0 with event-id, or event-id in headers but no data). Stop on `SaicLogoutException` or generic `SaicApiException`.
- **Event-ID update:** On each retry, the event-id from the exception is used for the next attempt.

### Response Code Table

| Code | Meaning                          | Action              |
|------|----------------------------------|---------------------|
| 0    | Success                          | Parse `data` field  |
| 2    | Error                            | Throw, do not retry |
| 3    | Error                            | Throw, do not retry |
| 7    | Error                            | Throw, do not retry |
| 401  | Unauthorized                     | Logout + throw      |
| 403  | Forbidden                        | Logout + throw      |
| Other| Varies; retry if event-id exists | Retry with new event-id |

The HTTP status code is also checked: 401/403 at the HTTP level triggers logout.

---

## 7. Operational Discipline (from saic-python-mqtt-gateway)

### 7.1 Polling Intervals

| Phase              | Default Interval | Notes                                                    |
|--------------------|------------------|----------------------------------------------------------|
| **Active** (HV battery on, driving) | 30 seconds | Minimum polling interval |
| **After shutdown** | 120 seconds      | Grace period after car powers off                        |
| **Inactive** (HV battery off, car asleep) | **86400 seconds (24 hours)** | Protects the 12V battery |
| **Inactive grace period** | 600 seconds (10 min) | How long to keep polling at after-shutdown rate before dropping to inactive |
| **Charging** | Dynamic | Calculated from power draw: `36 * battery_capacity_kWh / |power_kW|` seconds for 1% SOC change |
| **Error recovery** | Exponential backoff | Starts at `refresh_period_active`, doubles each failure up to `refresh_period_inactive` |
| **Messages** | 60 seconds | Account-level message polling interval |

### 7.2 Battery Protection Rules

1. **Never poll at the active rate when the car is asleep.** The active rate (30s) wakes the car's T-Box, which draws from the 12V battery. The 24-hour inactive interval prevents draining it.
2. **Charging with <1kW power:** Uses at least the after-shutdown period (120s) instead of the active rate to avoid wasting API quota on trickle charging.
3. **Charging refresh period is clamped:** `max(refresh_period_active, min(computed, refresh_period_inactive))`.
4. **Default to cached reads.** Only send a live wake-up request when the user explicitly opts in.

### 7.3 Refresh Mode State Machine

```
PERIODIC (default)
  |
  +--> checks should_do_periodic_refresh()
  |      |
  |      +--> last_car_activity > last_poll  --> ACTIVE phase, poll now
  |      +--> last_failed_refresh exists     --> ERROR_RECOVERY phase, exponential backoff
  |      +--> is_charging                    --> CHARGING phase, dynamic interval
  |      +--> hv_battery_active              --> ACTIVE phase
  |      +--> within inactive_grace of shutdown --> AFTER_SHUTDOWN phase
  |      +--> else                           --> INACTIVE phase (24h)
  |
FORCE --> always poll immediately, then revert to previous mode
CHARGING_DETECTION --> poll immediately (resets last_car_shutdown), then revert
OFF --> never poll
```

### 7.4 Account Lockout Hazards

- **Failed logins:** Multiple failed login attempts may lock the account. Rate-limit login attempts.
- **Session conflict:** The API is hostile to multi-session. A new login invalidates the previous session. The gateway detects this (401/403) and schedules a re-login with a 15-minute delay by default (`saic_relogin_delay`).
- **API throttling:** Undocumented rate limits exist. Aggressive polling can get the account throttled.

---

## 8. Vehicle Control Command Details

### 8.1 Find My Car (type `0`)

```typescript
params = [
  { paramId: 1, paramValue: base64(0x01) },  // enable (0x00 to stop)
  { paramId: 2, paramValue: base64(0x01) },  // horn on/off
  { paramId: 3, paramValue: base64(0x01) },  // lights on/off
  { paramId: 255, paramValue: base64(0x00000000) },  // PARAMS_MAX terminator
]
```

### 8.2 Lock Vehicle (type `1`)

No params needed (null rvcParams).

### 8.3 Unlock Vehicle (type `2`)

```typescript
params = [
  { paramId: 4, paramValue: base64(0x00) },   // UNK_4
  { paramId: 5, paramValue: base64(0x00) },   // UNK_5
  { paramId: 6, paramValue: base64(0x00) },   // UNK_6
  { paramId: 7, paramValue: base64(lockId) },  // 3=doors, 2=tailgate
  { paramId: 255, paramValue: base64(0x00000000) },
]
```

### 8.4 Climate Control (type `6`)

```typescript
params = [
  { paramId: 19, paramValue: base64(fanSpeed) },    // 0=off, 1=low, 2=med, 3=high, 5=defrost
  { paramId: 20, paramValue: base64(tempIdx) },      // temperature index (model-specific)
  { paramId: 22, paramValue: base64(acOnOff) },      // 1=on, 0=off
  { paramId: 255, paramValue: base64(0x00000000) },
]
```

**MG4 (EH32) Temperature Index:**
- min_temp=17, max_temp=33, temp_offset=3
- Index = temperature - 17 + 3 (i.e., 17C=idx 3, 22C=idx 8, 33C=idx 19)
- Default temperature index: 8 (= 22C for MG4)

### 8.5 Heated Seats (type `5`)

```typescript
params = [
  { paramId: 17, paramValue: base64(driverLevel) },     // 0-3
  { paramId: 18, paramValue: base64(passengerLevel) },   // 0-3
  { paramId: 255, paramValue: base64(0x00000000) },
]
```

### 8.6 Windows (type `3`)

```typescript
params = [
  { paramId: 8,  paramValue: base64(sunroof ? 0x01 : 0x00) },
  { paramId: 9,  paramValue: base64(driver ? 0x01 : 0x00) },
  { paramId: 10, paramValue: base64(window2 ? 0x01 : 0x00) },
  { paramId: 11, paramValue: base64(window3 ? 0x01 : 0x00) },
  { paramId: 12, paramValue: base64(window4 ? 0x01 : 0x00) },
  { paramId: 13, paramValue: base64(shouldOpen ? 0x03 : 0x00) },
]
```

### 8.7 Rear Window Heat (type `32`)

```typescript
params = [
  { paramId: 23, paramValue: base64(enable ? 0x01 : 0x00) },
  { paramId: 255, paramValue: base64(0x00000000) },
]
```

---

## 9. PIN / Passcode Requirements

From the source code analysis:
- **No explicit PIN check found in the client library.** The `saic-python-client-ng` does not implement PIN-gated commands - there is no PIN parameter in any API call.
- **The MQTT gateway does not send a PIN for any command.**
- **Lock/unlock, climate, charging, find-my-car:** All commands are sent without a PIN in the observed implementations.
- **Status:** The PIN requirement is **Unconfirmed / likely not applicable** for the API-level commands. The phone app may enforce PIN locally, but the API does not appear to gate commands behind a PIN.

This needs live verification with the actual MG4 account in Sub-Plan A step 4.

---

## 10. Data Conversion Reference

| Raw Field                   | Unit / Conversion                          |
|-----------------------------|--------------------------------------------|
| `mileage`                   | Multiply by 0.1 for km                     |
| `fuelRangeElec`             | Multiply by 0.1 for km                     |
| `*TyrePressure`             | Multiply by 0.04 for bar                   |
| `bmsPackCrnt`               | `value * 0.05 - 1000.0` for amps           |
| `bmsPackVol`                | `value * 0.25` for volts                   |
| `bmsPackSOCDsp`             | Multiply by 0.1 for percentage             |
| Power (derived)             | `(current * voltage) / 1000.0` for kW      |
| GPS latitude/longitude      | Divide by 1000000 for degrees              |
| `exteriorTemperature`       | Direct Celsius (from source analysis, may need offset verification) |
| `interiorTemperature`       | Direct Celsius                              |

---

## 11. Confirmation Status Table

| Item                                | Status       | Source                    |
|-------------------------------------|--------------|---------------------------|
| EU gateway URL and region code      | Confirmed    | client-ng defaults        |
| AU gateway URL                      | Confirmed    | mqtt-gateway docs         |
| TR gateway URL                      | Confirmed    | mqtt-gateway docs         |
| **IL (Israel) gateway URL**         | **Confirmed** | **Live login 2026-08-12** |
| IL tenant ID (459771)               | Confirmed    | Live login 2026-08-12     |
| API path prefix `/api.app/v1/`      | Confirmed    | client-ng defaults        |
| Login endpoint POST /oauth/token    | Confirmed    | client-ng base.py         |
| Password is SHA-1 hashed            | Confirmed    | client-ng base.py         |
| AES-128-CBC encryption              | Confirmed    | client-ng crypto_utils.py |
| Key derivation via MD5              | Confirmed    | client-ng crypto.py       |
| Hex encoding of ciphertext          | Confirmed    | client-ng crypto_utils.py |
| HMAC-SHA256 verification header     | Confirmed    | client-ng crypto.py       |
| Event-id polling (30s timeout, 3s interval) | Confirmed | client-ng base.py    |
| Vehicle status endpoint             | Confirmed    | client-ng vehicle API     |
| Charging mgmt data endpoint         | Confirmed    | client-ng charging API    |
| Vehicle control command endpoint    | Confirmed    | client-ng vehicle API     |
| Lock/unlock commands                | Confirmed    | client-ng locks API       |
| Climate control commands            | Confirmed    | client-ng climate API     |
| Window control commands             | Confirmed    | client-ng windows API     |
| Charging control commands           | Confirmed    | client-ng charging API    |
| Message/alarm endpoints             | Confirmed    | client-ng message API     |
| Default polling intervals           | Confirmed    | mqtt-gateway vehicle.py   |
| PIN requirement for any command     | Unconfirmed  | Not observed in code      |
| Israeli account login success       | **Confirmed** | Live login 2026-08-12, token + vehicle list OK |
| MG4 Electric 2025 vehicle list      | **Confirmed** | VIN LSJWH4091TN019736, series EH32MY25 S |
| MG4 command support                 | Not Yet Tested | Needs live command test |

---

## 12. Open Items for Live Verification

1. ~~**Gateway authentication:** Run the spike script with user credentials against `gateway-mg-il.soimt.com` to confirm login succeeds.~~ **RESOLVED** - Login succeeded 2026-08-12.
2. **PIN behavior:** Log in and attempt a safe command (find-my-car) to see if any PIN prompt is returned. (Low risk - no PIN found in source code.)
3. **MG4 Electric 2025 command set:** Verify which commands the specific model/year supports by attempting each command type. Vehicle is series `EH32MY25 S` (MG4 family).
4. **Temperature index mapping:** Verify the MG4's temperature-to-index mapping. Based on mg-saic-ha profiles, MG4 (EH32): min_temp=17, max_temp=33, temp_offset=3.
5. **GPS coordinate scaling:** Confirm whether latitude/longitude need division by 1000000 or some other factor.
6. **TLS certificate:** The SAIC gateway uses a CA not in the default Node.js trust store. Need to either bundle the CA cert or disable strict TLS validation in the client.
