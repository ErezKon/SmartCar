# User Question
I’m building an app that integrates with my smart car (MG 4) to fetch data and send commands, using the SAIC-iSmart-API: https://github.com/SAIC-iSmart-API. I want to able to recievea notification, like webhook, and run a callback when the car starts charging, and when it stops charging. I’ve seen in SmartCar API (https://smartcar.com/docs/api-reference/intro) the ability of webhooks, unfortunately it is not supported in my country (israel) is it possible with SAIC? If not, is there any other way to accomplish it?

# Chat Response

## Charging Notifications with SAIC-iSmart-API

### Short Answer

**No, the SAIC-iSmart-API does not support webhooks or push notifications natively.** It's a community reverse-engineered client that talks to SAIC's cloud — there's no server-side webhook registration mechanism.

However, you have several practical alternatives to achieve the same result.

---

### Option 1: Polling + State Change Detection (Most Direct)

The most straightforward approach — poll the charging status at intervals and fire your own callback/webhook when the state changes.

```python
import asyncio
import time
import httpx
from enum import Enum
from dataclasses import dataclass, field
from typing import Callable, Awaitable, Optional

from saic_ismart_client_ng import SaicApi
from saic_ismart_client_ng.model import SaicApiConfiguration


class ChargingState(Enum):
    CHARGING = "charging"
    NOT_CHARGING = "not_charging"
    UNKNOWN = "unknown"


@dataclass
class ChargingMonitor:
    """
    Polls the SAIC API for charging status changes
    and invokes registered callbacks when transitions occur.
    """
    username: str
    password: str
    vin: str  # your MG4's VIN
    poll_interval_seconds: int = 120  # how often to poll (be gentle on the API)
    _previous_state: ChargingState = field(default=ChargingState.UNKNOWN, init=False)
    _on_charging_started: list[Callable[..., Awaitable]] = field(default_factory=list, init=False)
    _on_charging_stopped: list[Callable[..., Awaitable]] = field(default_factory=list, init=False)
    _api: Optional[SaicApi] = field(default=None, init=False)

    def on_charging_started(self, callback: Callable[..., Awaitable]):
        """Register a callback for when charging begins."""
        self._on_charging_started.append(callback)
        return callback

    def on_charging_stopped(self, callback: Callable[..., Awaitable]):
        """Register a callback for when charging ends."""
        self._on_charging_stopped.append(callback)
        return callback

    async def _init_api(self):
        config = SaicApiConfiguration(
            username=self.username,
            password=self.password,
            region="eu",  # adjust if needed
        )
        self._api = SaicApi(config)
        await self._api.login()

    def _determine_charging_state(self, chrg_mgmt_data) -> ChargingState:
        """
        Interpret the charging status from the API response.

        The raw field varies by client version. Common indicators:
        - bmsPackCrnt (current flowing into the battery)
        - chrgStatus or chargingStatus field
        - Check the proto/model definitions in saic-python-client-ng
          for exact field names.
        """
        try:
            # Typical check — adapt field names to the actual API model
            charging_status = chrg_mgmt_data.bmsChrgSts  # example field
            if charging_status == 1:  # actively charging
                return ChargingState.CHARGING
            else:
                return ChargingState.NOT_CHARGING
        except AttributeError:
            # Fallback: check if charging current is non-zero
            try:
                if chrg_mgmt_data.bmsPackCrnt and chrg_mgmt_data.bmsPackCrnt > 0:
                    return ChargingState.CHARGING
                return ChargingState.NOT_CHARGING
            except AttributeError:
                return ChargingState.UNKNOWN

    async def _check_and_notify(self):
        """Single poll iteration: fetch status, detect transitions."""
        try:
            # Fetch charging management data for your vehicle
            vehicle_status = await self._api.get_vehicle_status(self.vin)
            chrg_mgmt_data = await self._api.get_vehicle_charging_management_data(self.vin)

            current_state = self._determine_charging_state(chrg_mgmt_data)

            if current_state == self._previous_state or current_state == ChargingState.UNKNOWN:
                return

            # --- State transition detected ---
            if (
                current_state == ChargingState.CHARGING
                and self._previous_state != ChargingState.CHARGING
            ):
                print(f"[{time.strftime('%H:%M:%S')}] ⚡ Charging STARTED")
                for cb in self._on_charging_started:
                    await cb(chrg_mgmt_data)

            elif (
                current_state == ChargingState.NOT_CHARGING
                and self._previous_state == ChargingState.CHARGING
            ):
                print(f"[{time.strftime('%H:%M:%S')}] 🔌 Charging STOPPED")
                for cb in self._on_charging_stopped:
                    await cb(chrg_mgmt_data)

            self._previous_state = current_state

        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] Error polling: {e}")

    async def run(self):
        """Main polling loop — runs indefinitely."""
        await self._init_api()
        print(f"Monitoring charging status for VIN {self.vin}")
        print(f"Poll interval: {self.poll_interval_seconds}s")

        while True:
            await self._check_and_notify()
            await asyncio.sleep(self.poll_interval_seconds)
```

#### Usage with webhook callbacks

```python
import httpx

monitor = ChargingMonitor(
    username="your_saic_email",
    password="your_saic_password",
    vin="YOUR_MG4_VIN",
    poll_interval_seconds=120,  # every 2 minutes
)


@monitor.on_charging_started
async def notify_charging_started(data):
    """Send a webhook when charging starts."""
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://your-server.com/webhook/charging",
            json={
                "event": "charging_started",
                "timestamp": time.time(),
                "soc": getattr(data, "bmsPackSOCDsp", None),
            },
        )


@monitor.on_charging_stopped
async def notify_charging_stopped(data):
    """Send a webhook when charging stops."""
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://your-server.com/webhook/charging",
            json={
                "event": "charging_stopped",
                "timestamp": time.time(),
                "soc": getattr(data, "bmsPackSOCDsp", None),
            },
        )


# Run the monitor
asyncio.run(monitor.run())
```

> **⚠️ Important Note on Field Names:** The exact field names (`bmsChrgSts`, `bmsPackCrnt`, `bmsPackSOCDsp`) depend on the version of `saic-ismart-client-ng` you're using. Inspect the protobuf/model definitions in the repo or print the raw response to identify the correct field names for charging status.

---

### Option 2: MQTT Gateway (Event-Driven, Recommended)

The same community maintains **[saic-python-mqtt-gateway](https://github.com/SAIC-iSmart-API/saic-python-mqtt-gateway)**, which continuously publishes vehicle data to an MQTT broker. This is more event-driven and architecturally cleaner.

#### Architecture

```
┌──────────────┐      ┌──────────────────┐      ┌──────────────┐
│  SAIC Cloud  │◄────►│  MQTT Gateway    │─────►│ MQTT Broker  │
│  (iSmart)    │      │  (runs locally)  │      │ (Mosquitto)  │
└──────────────┘      └──────────────────┘      └──────┬───────┘
                                                       │
                                                       ▼
                                               ┌──────────────┐
                                               │ Your App     │
                                               │ (subscriber) │
                                               └──────────────┘
```

#### Setup

```bash
# 1. Run an MQTT broker (e.g., Mosquitto)
docker run -d --name mosquitto -p 1883:1883 eclipse-mosquitto

# 2. Run the SAIC MQTT gateway
docker run -d \
  -e SAIC_USER=your_email \
  -e SAIC_PASSWORD=your_password \
  -e MQTT_URI=mqtt://host.docker.internal:1883 \
  -e VEHICLE_VIN=YOUR_MG4_VIN \
  ghcr.io/saic-ismart-api/saic-python-mqtt-gateway:latest
```

#### Subscribe to Charging Events

```python
import json
import asyncio
import aiomqtt
import httpx

# MQTT topics published by the gateway follow this pattern:
# saic/{vin}/drivetrain/chargingStatus
# saic/{vin}/drivetrain/soc
# (check the gateway docs for the exact topic structure)

VIN = "YOUR_MG4_VIN"
CHARGING_TOPIC = f"saic/{VIN}/drivetrain/charging"  # adjust per actual topic


async def monitor_via_mqtt():
    previous_charging = None

    async with aiomqtt.Client("localhost", 1883) as client:
        # Subscribe to all drivetrain topics for your VIN
        await client.subscribe(f"saic/{VIN}/drivetrain/#")

        async for message in client.messages:
            topic = str(message.topic)
            payload = message.payload.decode()

            # Look for charging status changes
            if "charg" in topic.lower():
                print(f"Topic: {topic} → {payload}")

                is_charging = payload.lower() in ("true", "1", "charging")

                if previous_charging is not None and is_charging != previous_charging:
                    event = "charging_started" if is_charging else "charging_stopped"
                    print(f"🔔 Event: {event}")

                    # Fire your webhook
                    async with httpx.AsyncClient() as http:
                        await http.post(
                            "https://your-server.com/webhook/charging",
                            json={"event": event},
                        )

                previous_charging = is_charging


asyncio.run(monitor_via_mqtt())
```

---

### Option 3: Home Assistant Integration

If you're open to using **Home Assistant**, there's an official(ish) integration:

```yaml
# In Home Assistant, you can create an automation:
automation:
  - alias: "MG4 Charging Started"
    trigger:
      - platform: state
        entity_id: binary_sensor.mg4_charging     # entity name varies
        from: "off"
        to: "on"
    action:
      - service: rest_command.notify_charging_started

  - alias: "MG4 Charging Stopped"
    trigger:
      - platform: state
        entity_id: binary_sensor.mg4_charging
        from: "on"
        to: "off"
    action:
      - service: rest_command.notify_charging_stopped

rest_command:
  notify_charging_started:
    url: "https://your-server.com/webhook/charging"
    method: POST
    payload: '{"event": "charging_started"}'
    content_type: "application/json"

  notify_charging_stopped:
    url: "https://your-server.com/webhook/charging"
    method: POST
    payload: '{"event": "charging_stopped"}'
    content_type: "application/json"
```

---

### Comparison

| Approach | Latency | Complexity | Reliability |
|---|---|---|---|
| **Polling (Option 1)** | Depends on interval (1–5 min typical) | Low — single script | Simple but hammers the API if too frequent |
| **MQTT Gateway (Option 2)** | ~30s–2min (gateway's own poll) | Medium — needs broker + gateway | Robust, community-maintained |
| **Home Assistant (Option 3)** | ~30s–2min | Low if you already use HA | Very mature ecosystem |

---

### Key Caveats

1. **API Rate Limits**: SAIC's cloud may throttle or block you if you poll too aggressively. **2-minute intervals** are generally considered safe. The MQTT gateway already handles this responsibly.

2. **Wake-up Behavior**: The car's telematics module sleeps when the car is off/idle. Polling *may* wake it and cause minor 12V battery drain over time. Charging events are less problematic since the car is already awake when plugged in.

3. **Field Name Accuracy**: The code above uses *approximate* field names. I strongly recommend inspecting the actual response objects:
   ```python
   data = await api.get_vehicle_charging_management_data(vin)
   print(vars(data))  # see what fields are actually available
   ```

4. **Authentication Tokens**: The SAIC API tokens expire. Both the Python client and the MQTT gateway handle token refresh, but if you build a long-running service with Option 1, make sure you handle re-authentication.

Would you like me to dive deeper into any of these approaches or help you set up one of them end-to-end?

# User Question Follow-up
in the MQTT option, does it actually polling behind the scenes? how are the events coming?

# Chat Response

## How the MQTT Gateway Actually Works

### Yes — It's Polling Behind the Scenes

There is **no true push mechanism** from SAIC's cloud to third-party consumers. The architecture looks like this:

```
┌─────────┐  pushes data   ┌─────────────┐  polling    ┌──────────────┐  publishes  ┌────────────┐
│  MG4    │───────────────►│  SAIC Cloud  │◄───────────│ MQTT Gateway │────────────►│MQTT Broker │
│  T-BOX  │  (cellular)    │  (iSmart)    │  (HTTP)    │              │  (topics)   │            │
└─────────┘                └─────────────┘             └──────────────┘             └────────────┘
     │                                                                                     │
     │  The car's telematics unit                                          Your app subscribes
     │  DOES push to SAIC's cloud                                          and gets "events"
     │  on real events — but SAIC                                          that are really just
     │  offers no webhook API                                              detected state changes
     │  for YOU to subscribe to.                                           from consecutive polls.
```

### What Happens Step by Step

```
Timeline:
                                                                    
 Car plugged in ──────────────────────────────────────────────────►

 T-BOX pushes to SAIC cloud ─────────────────────────────────────►
                              (almost immediately)

 Gateway polls SAIC cloud ────┐                                    
   poll #1  (not charging)    │                                    
   poll #2  (not charging)    │   ◄── up to N seconds of delay    
   poll #3  (CHARGING!) ──────┘       before detection            
                                                                   
 Gateway publishes to MQTT ──── "charging = true"                  
                                                                   
 Your app receives MQTT msg ── fires your webhook                  
```

### The Gateway's Smart Polling Strategy

The gateway doesn't just blindly poll at a fixed interval — it uses **adaptive polling**:

```
┌─────────────────────────────────────────────────────────┐
│              Gateway Polling Behavior                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Car is IDLE / parked:                                  │
│    → Polls infrequently (every ~15-30 min)              │
│    → Avoids draining the 12V battery                    │
│                                                         │
│  Car is ACTIVE (driving / charging):                    │
│    → Polls frequently (every ~30s - 2 min)              │
│    → Gives you near-real-time data                      │
│                                                         │
│  Charging state CHANGE detected:                        │
│    → Immediately publishes to MQTT                      │
│    → May increase poll frequency temporarily            │
│                                                         │
│  SAIC "alarm" messages:                                 │
│    → The API has a /notifications or /alarm endpoint    │
│    → The T-BOX triggers server-side alarms for events   │
│      like charging start/stop                           │
│    → Gateway checks these too — this is often FASTER    │
│      than polling the vehicle status directly           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

That **alarm/notification mechanism** is the key nuance. The SAIC cloud does internally track events that the car's T-BOX reports. The gateway checks for those alarm messages, which can provide faster detection than pure status polling.

### So What Are Your Real-World Latencies?

| Scenario | Detection Delay |
|---|---|
| Car starts charging (gateway already in active polling) | **~30s – 2 min** |
| Car starts charging (gateway was in idle/sleep mode) | **~2 – 15 min** (worst case until next poll or alarm check) |
| Car stops charging | **~30s – 2 min** (gateway is actively polling during charging) |

### The Honest Bottom Line

```
                  ┌──────────────────────────────────────┐
                  │                                      │
                  │   Every approach you can use with    │
                  │   SAIC is polling at some layer.     │
                  │                                      │
                  │   • Option 1 (direct) — YOU poll     │
                  │   • Option 2 (MQTT)  — GATEWAY polls │
                  │   • Option 3 (HA)    — HA polls      │
                  │                                      │
                  │   The MQTT gateway just abstracts     │
                  │   it into a cleaner event-driven      │
                  │   interface for your app.             │
                  │                                      │
                  └──────────────────────────────────────┘
```

### Why MQTT Is Still the Best Choice

Even though it's polling underneath, it gives you meaningful advantages over doing it yourself:

1. **You don't manage polling logic** — adaptive intervals, retries, token refresh, all handled
2. **Clean separation** — your app just subscribes to topics and reacts
3. **Multiple consumers** — any number of apps can subscribe to the same MQTT topics
4. **Alarm-aware** — the gateway already knows to check SAIC's alarm/notification endpoints, not just raw status
5. **Community-maintained** — edge cases around T-BOX sleep, session management, etc. are handled

If sub-30-second latency on charging events is critical for your use case, none of these approaches will guarantee it — that's a limitation of SAIC's ecosystem, not of any particular client. But for most practical purposes (triggering home automations, logging, notifications), the 30s–2min delay from the MQTT gateway is perfectly fine.

# User Question Follow-up
so the MQTT is polling the cloud and not the car? it won’t wake up my car and drain its 12V?

# Chat Response

## It's More Nuanced Than That

### The Gateway Polls the Cloud, BUT...

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  MQTT Gateway ──HTTP──► SAIC Cloud ──cellular──► Car T-BOX    │
│                                                                │
│  You're right that the gateway talks to the cloud, NOT the     │
│  car directly. But here's the catch:                           │
│                                                                │
│  When the cloud receives your status request, it may           │
│  WAKE UP the T-BOX over cellular to fetch fresh data.          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### How It Actually Works

```
Scenario A: Car is already awake (charging / driving)
─────────────────────────────────────────────────────
  Gateway ──► SAIC Cloud ──► T-BOX (already awake)
                                │
                                └── No extra drain.
                                    T-BOX is already powered
                                    by the high-voltage battery.
                                    ✅ Totally fine.


Scenario B: Car is parked and asleep
─────────────────────────────────────
  Gateway ──► SAIC Cloud ──► T-BOX (sleeping)
                                │
                                └── Cloud sends a WAKE-UP signal
                                    T-BOX powers on via 12V battery
                                    Responds with fresh data
                                    Goes back to sleep
                                    ⚠️ THIS is what drains 12V.
```

### So Yes, There IS a 12V Drain Risk

But the gateway has configuration options to mitigate this:

```yaml
# docker-compose.yml for the MQTT gateway
environment:
  # These settings control how aggressively it polls
  # when the car is inactive

  # After the car has been inactive for this many seconds,
  # the gateway reduces polling dramatically or stops
  CHARGING_STATION_INACTIVE_POLLING_INTERVAL: 3600  # once per hour when idle

  # How often to poll while actively charging
  CHARGING_ACTIVE_POLLING_INTERVAL: 30              # every 30s while charging

  # Force the car into sleep mode — gateway will NOT
  # poll when the vehicle is detected as inactive
  ALLOW_VEHICLE_SLEEP: true    # ← THIS IS THE KEY SETTING
```

### The Key Distinction

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  While CHARGING:                                          │
│  ✅ No 12V drain risk                                     │
│  ✅ Car is awake anyway (HV battery powers everything)    │
│  ✅ Poll as frequently as you want                        │
│                                                           │
│  While PARKED / IDLE:                                     │
│  ⚠️ Each poll CAN wake the T-BOX                          │
│  ⚠️ T-BOX wake-up draws from 12V battery                  │
│  ⚠️ Frequent polling = potential dead 12V battery          │
│     (especially if parked for days)                       │
│                                                           │
│  This is a known issue in the MG/SAIC community.          │
│  People HAVE reported dead 12V batteries from             │
│  overly aggressive polling.                               │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Practical Recommendations for Your Use Case

Since you specifically care about **charging start/stop events**:

```
Strategy: Only poll aggressively when it matters
─────────────────────────────────────────────────

1. Car is parked, NOT plugged in
   → Poll very rarely (once/hour) or not at all
   → You don't care about charging events here anyway

2. Car is plugged in but not yet charging
   → Poll moderately (every 5-10 min)
   → Waiting to detect charging start

3. Car is actively charging
   → Poll frequently (every 30s-2 min)
   → No 12V risk, car is fully awake
   → Detect charging stop quickly

4. Charging complete, car still plugged in
   → Reduce polling back to moderate/low
```

The MQTT gateway essentially does this already when configured properly. The `ALLOW_VEHICLE_SLEEP: true` setting is the most important — it tells the gateway to back off when the car wants to sleep.

### The Short Answer to Your Question

> **The gateway polls the cloud, not the car directly — but the cloud can wake the car. During charging this doesn't matter (car is already awake). When parked and idle, it can drain 12V if misconfigured. Configure `ALLOW_VEHICLE_SLEEP: true` and you'll be fine.**
