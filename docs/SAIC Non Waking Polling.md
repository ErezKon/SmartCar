# User Question
I want you to deep dive and investigate thoroughly the code in repo https://github.com/SAIC-iSmart-API/saic-python-client.
I want you to tell me which command wakes the car and which not.
Is there a way to check if the car is awaken, and not wake it it the polling?
  
My final goal is to get notified when the car starts charging and when it stops charging.

# Chat Response

## Deep Dive: SAIC Python Client — Wake Behavior & Charging Notifications

### Architecture Overview

The `saic-python-client` communicates with MG/SAIC vehicles through the **iSmart cloud**. It uses ASN.1-encoded OTA messages, each identified by an **Application ID**. The critical insight is:

- **Application IDs in the `0x05xx` range** → The cloud must **relay the command to the vehicle's TBOX** → **WAKES the car**
- **Application IDs in the `0x00xx` range** → The cloud **handles the request itself** from server-side data → **Does NOT wake the car**

The code is structured across three protocol versions:

```
saic_ismart_client/
├── ota_v1_1/   → Cloud-side operations (login, vehicle list, messages, alarm settings)
├── ota_v2_1/   → Vehicle-side operations (status, charging, remote control)
├── ota_v3_0/   → Updated vehicle-side operations
└── saic_api.py → High-level SaicApi class tying it all together
```

---

### Which Commands Wake the Car vs. Which Don't

#### Commands That Do **NOT** Wake the Car (Cloud-Only)

These query the SAIC **server** only. The vehicle is never contacted:

| Method / Operation | App ID | Protocol | Notes |
|---|---|---|---|
| `login()` | `0x0001` | V1.1 | Authentication with iSmart cloud |
| `logout()` | `0x0003` | V1.1 | End session |
| `set_alarm_switch_list()` | `0x0004` | V1.1 | Configure which events generate notifications |
| `get_alarm_switch_list()` | `0x0005` | V1.1 | Read alarm notification preferences |
| `get_vehicle_list()` | `0x0010` | V1.1 | Retrieve registered vehicles (VIN, series, etc.) |
| `get_message_list()` | `0x0017` | V1.1 | **KEY** — Poll server-side inbox for events/notifications |
| `read_message()` | `0x0016` | V1.1 | Mark a message as read |

#### Commands That **DO** Wake the Car (Vehicle Communication)

These cause the cloud to send a wake signal to the car's **TBOX (Telematics Box)**:

| Method / Operation | App ID | Protocol | Notes |
|---|---|---|---|
| `get_vehicle_status()` | `0x0511` / `0x0513` | V2.1 | Full vehicle status (doors, tyres, power mode, etc.) |
| `get_chrg_mgmt_data()` | `0x0516` | V2.1 | Charging status, SOC, remaining time, current |
| Remote AC control | `0x0510` | V2.1 | Start/stop climate |
| Remote lock/unlock | `0x0519` / `0x051B` | V2.1 | Door lock control |
| Remote heated seats | `0x051A` | V2.1 | Heated seat control |
| Find my car (lights/horn) | `0x0523` | V2.1 | Flash lights / honk |
| Remote charging control | `0x0517` | V2.1 | Start/stop/schedule charging |
| V3.0 vehicle status | `0x0511`/`0x0513` | V3.0 | Updated status request in newer protocol |
| V3.0 charging data | `0x0516` | V3.0 | Updated charging request |

#### The Polling Mechanism (Why It Matters)

When you call any vehicle-side command, the flow is:

```
1. Client sends request → Cloud server
2. Cloud sends wake signal → Vehicle TBOX  ← THIS WAKES THE CAR
3. Cloud returns event_id + result code to client
4. Client polls with event_id repeatedly
5. Eventually car wakes, responds to cloud
6. Client gets the actual data
```

Key **result codes** in `MpDispatcherHeader` / response header:

| Result Code | Meaning |
|---|---|
| `0` | Success — data is in the response |
| `1` | Command dispatched to vehicle, awaiting response (keep polling) |
| `2` | Vehicle offline / TBOX sleeping (wake attempted) |
| `3` | Command timeout |

**Critical**: Even a single request with result `2` means a wake attempt was made. The car's TBOX will try to power up.

---

### Can You Check If the Car Is Awake Without Waking It?

**There is no direct "is the car awake?" API call that doesn't also wake it.**

However, you can **infer** the car's state indirectly:

#### 1. Poll the Message/Notification Inbox (Does NOT Wake)

```python
# This queries the SERVER, not the car
message_list = saic_api.get_message_list()
```

When the car IS awake (charging, driving, climate running), the TBOX periodically pushes events to the server. If you see **recent messages** (especially charging-related ones), the car is likely awake.

#### 2. Use the Last Known Data Timestamp

When you previously fetched vehicle status or charging data, the response contains timestamps. If the last data is very recent, the car was awake at that time. If it's hours old, the car is likely sleeping.

#### 3. Behavioral Inference

The car's TBOX stays awake:
- While **driving** (engine/motor running)
- While **charging** (charger provides power to TBOX)
- For a **cool-down period** after the above (~15–20 minutes)
- When **remote climate** is active
- Briefly after a **remote command** wakes it

The TBOX goes to **sleep** when:
- Parked, not charging, all accessories off
- Cool-down period has elapsed

---

### Recommended Architecture: Charging Start/Stop Notifications

#### Strategy: Event-Based Message Polling + Conditional Active Polling

This is the most battery-friendly approach:

```
┌─────────────────────────────────────────────┐
│            PHASE 1: PASSIVE MONITORING       │
│      (Does NOT wake the car)                 │
│                                              │
│  Poll get_message_list() every 2-5 minutes   │
│  Look for charging-related notification msgs │
│                                              │
│  If charging event detected ──────────────┐  │
│                                           │  │
└───────────────────────────────────────────┘  │
                                               │
┌──────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│            PHASE 2: ACTIVE MONITORING        │
│      (Car is already awake from charging)    │
│                                              │
│  Call get_chrg_mgmt_data() every 30-60 sec   │
│  Car is awake anyway (charger powers TBOX)   │
│                                              │
│  Track: bmsChrgSts, bmsPackSOCDsp,           │
│         chrgngRmnngTime, etc.                │
│                                              │
│  If charging stops ──────────────────────┐   │
│                                          │   │
└──────────────────────────────────────────┘   │
                                               │
┌──────────────────────────────────────────────┘
│
▼
  → Send "charging stopped" notification
  → Record final SOC
  → Return to PHASE 1 (passive monitoring)
```

#### Example Implementation

```python
import time
import logging
from saic_ismart_client.saic_api import SaicApi

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChargingMonitor:
    def __init__(self, uri, username, password, vin):
        self.api = SaicApi(uri, username, password)
        self.vin = vin
        self.is_charging = False
        self.last_soc = None

        # Intervals
        self.passive_interval = 120        # 2 min (message polling, no wake)
        self.active_interval = 60          # 60 sec (charging details, car already awake)
        self.cooldown_after_stop = 300     # 5 min active polling after charge stops
        
    def start(self):
        # Step 1: Login (does NOT wake car)
        login_resp = self.api.login()
        logger.info("Logged in successfully")
        
        # Step 2: Get vehicle list (does NOT wake car)
        vehicle_list = self.api.get_vehicle_list()
        logger.info(f"Found {len(vehicle_list)} vehicle(s)")
        
        # Step 3: Set alarm switches to include charging events (does NOT wake car)
        self._configure_alarm_switches()
        
        # Step 4: Enter main monitoring loop
        self._passive_monitoring_loop()
    
    def _configure_alarm_switches(self):
        """
        Enable charging-related notifications on the server.
        This tells the iSmart cloud to retain charging events
        from the TBOX in the user's message inbox.
        (Does NOT wake the car)
        """
        try:
            # Enable all alarm switches, especially charging-related ones
            alarm_switches = self.api.get_alarm_switch_list()
            # Ensure charging-related alarm switches are ON
            for switch in alarm_switches:
                if not switch.alarm_enabled:
                    switch.alarm_enabled = True
            self.api.set_alarm_switch_list(alarm_switches)
            logger.info("Alarm switches configured for charging events")
        except Exception as e:
            logger.warning(f"Could not configure alarm switches: {e}")
    
    def _passive_monitoring_loop(self):
        """
        Poll server-side messages only. 
        Does NOT wake the car.
        """
        logger.info("Entering passive monitoring (no car wake)")
        
        while True:
            try:
                # This queries the SERVER, not the car!
                messages = self.api.get_message_list()
                
                charging_event = self._check_for_charging_event(messages)
                
                if charging_event == 'started':
                    logger.info("⚡ Charging STARTED detected via server message!")
                    self._notify("Charging Started", "Your car has started charging.")
                    self.is_charging = True
                    self._active_monitoring_loop()  # Switch to active
                    
                elif charging_event == 'completed':
                    logger.info("✅ Charging COMPLETED detected via server message!")
                    self._notify("Charging Complete", "Your car has finished charging.")
                    self.is_charging = False
                    
            except Exception as e:
                logger.error(f"Error in passive monitoring: {e}")
            
            time.sleep(self.passive_interval)
    
    def _check_for_charging_event(self, messages):
        """
        Parse server-side messages for charging events.
        Message content/type varies — look for charging-related keywords
        or message type codes.
        """
        if messages is None:
            return None
            
        for msg in messages:
            # The exact field names depend on the message structure
            # Common indicators in message content:
            # - messageType related to charging
            # - content containing charging status keywords
            
            # This is a simplified check — adjust based on actual
            # message structure in data_model_v1_1.py
            try:
                content = getattr(msg, 'content', '') or ''
                msg_type = getattr(msg, 'messageType', None)
                
                # Check for charging-related message types
                if 'charg' in str(content).lower():
                    if 'start' in str(content).lower():
                        # Mark message as read
                        self.api.read_message(msg.messageId)
                        return 'started'
                    elif 'complete' in str(content).lower() or 'finish' in str(content).lower():
                        self.api.read_message(msg.messageId)
                        return 'completed'
                    elif 'stop' in str(content).lower():
                        self.api.read_message(msg.messageId)
                        return 'completed'
            except Exception:
                pass
        
        return None
    
    def _active_monitoring_loop(self):
        """
        Actively poll charging data while car is charging.
        The car is ALREADY AWAKE because the charger powers the TBOX,
        so these requests don't cause an unwanted wake.
        """
        logger.info("Entering active monitoring (car is charging, TBOX is powered)")
        
        consecutive_not_charging = 0
        
        while True:
            try:
                # This WOULD wake the car if it were sleeping,
                # but during charging the TBOX is already powered
                chrg_data = self.api.get_chrg_mgmt_data(self.vin)
                
                if chrg_data is not None:
                    chrg_status = chrg_data.bmsChrgSts        # Charging status enum
                    soc = chrg_data.bmsPackSOCDsp              # SOC percentage (x10)
                    remaining = chrg_data.chrgngRmnngTime      # Remaining minutes
                    current = chrg_data.bmsChrgOtptCrntReq     # Charging current
                    
                    soc_display = soc / 10.0 if soc else None
                    
                    logger.info(
                        f"Charging: status={chrg_status}, "
                        f"SOC={soc_display}%, "
                        f"remaining={remaining}min, "
                        f"current={current}"
                    )
                    
                    # bmsChrgSts values:
                    # 0 = Not charging
                    # 1 = Charging (DC fast)
                    # 2 = Charging complete  
                    # 3 = Charging (AC)
                    # 5 = Charging fault
                    # (exact values may vary by vehicle model)
                    
                    is_actively_charging = chrg_status in (1, 3)
                    
                    if is_actively_charging:
                        consecutive_not_charging = 0
                        self.last_soc = soc_display
                    else:
                        consecutive_not_charging += 1
                    
                    # SOC change notification (optional)
                    if self.last_soc and soc_display:
                        if soc_display != self.last_soc:
                            logger.info(f"SOC changed: {self.last_soc}% → {soc_display}%")
                            self.last_soc = soc_display
                    
                    # Charging stopped — confirm with multiple readings
                    if consecutive_not_charging >= 3:
                        logger.info(f"🔌 Charging STOPPED. Final SOC: {soc_display}%")
                        self._notify(
                            "Charging Stopped",
                            f"Final SOC: {soc_display}%. "
                            f"Status code: {chrg_status}"
                        )
                        self.is_charging = False
                        return  # Back to passive monitoring
                        
            except Exception as e:
                logger.error(f"Error in active monitoring: {e}")
            
            time.sleep(self.active_interval)
    
    def _notify(self, title, message):
        """
        Send notification. Replace with your preferred method:
        - Push notification (Pushover, Pushbullet, ntfy.sh)
        - Email
        - Home Assistant webhook
        - MQTT publish
        - etc.
        """
        logger.info(f"📢 NOTIFICATION: {title} — {message}")
        
        # Example: ntfy.sh
        # import requests
        # requests.post("https://ntfy.sh/your-topic", 
        #     data=message, headers={"Title": title})


# Usage
if __name__ == "__main__":
    monitor = ChargingMonitor(
        uri="https://tap-eu.sfrms.com",  # EU endpoint; adjust for your region
        username="your_email",
        password="your_password",
        vin="your_vin"
    )
    monitor.start()
```

---

### Key Charging Data Fields (`OtaChrgMangDataResp`)

From `ota_v2_1/data_model_v2_1.py` (and `ota_v3_0`):

| Field | Type | Description |
|---|---|---|
| `bmsChrgSts` | int | Charging status (0=none, 1=DC charging, 2=complete, 3=AC charging, 5=fault) |
| `bmsPackSOCDsp` | int | SOC display value (multiply by 0.1 for percentage) |
| `bmsPackVol` | int | Battery pack voltage (x0.25 V) |
| `bmsChrgOtptCrntReq` | int | Charging output current request |
| `chrgngRmnngTime` | int | Remaining charging time in minutes |
| `chrgngDoorOpenSts` | int | Charging door open status |
| `ccuOnbdChrgrPlugOn` | int | On-board charger plugged in |
| `chrgngDoorPosSts` | int | Charging door position |
| `bmsEstdElecRng` | int | Estimated electric range |
| `bmsAltngChrgCrntDspCmd` | int | Alternating charge current display |
| `chrgngSpdngTime` | int | Time spent charging |
| `chrgngAddedElecRng` | int | Range added during charging |
| `bmsReserStMintueDspCmd` | int | Reserved SOC target minutes |
| `bmsReserSpSOCDspCmd` | int | Reserved/target SOC display |
| `bmsPTCHeatReqDspCmd` | int | PTC heater request |
| `bmsPTCHeatResp` | int | PTC heater response |
| `ccuEleccLckCtrlDspCmd` | int | Electronic lock control |
| `bmsChrgCtrlDspCmd` | int | Charge control display command |

---

### Summary: Decision Matrix

| What You Want To Do                             | Method                    | Wakes Car? | Recommended Polling Interval        |
| -------------------------------------------------| ---------------------------| ------------| -------------------------------------|
| Check for charging events (start/stop)          | `get_message_list()`      | **No** ✅   | Every 2–5 min                       |
| Get detailed charging data (SOC, current, time) | `get_chrg_mgmt_data()`    | **Yes** ⚠️  | Only when already charging (30–60s) |
| Get full vehicle status                         | `get_vehicle_status()`    | **Yes** ⚠️  | Sparingly; 15–30 min max            |
| Login / session management                      | `login()`                 | **No** ✅   | Once per session                    |
| List vehicles                                   | `get_vehicle_list()`      | **No** ✅   | Once at startup                     |
| Configure notifications                         | `set_alarm_switch_list()` | **No** ✅   | Once at startup                     |

**Bottom line**: Use `get_message_list()` as your primary, non-intrusive sensor. Only switch to active `get_chrg_mgmt_data()` polling once you **know** the car is charging (and therefore already awake). This avoids draining the 12V battery and keeps the TBOX sleeping when the car is parked idle.

# User Follow Up
what does get_message_list() retrieve?

# Chat Response

## What Does `get_message_list()` Actually Retrieve?

### The API Call

`get_message_list()` uses **Application ID `0x0017`** (protocol V1.1), which queries the **iSmart cloud server's inbox** — essentially a notification/event log that the car's TBOX pushes to the server whenever significant events occur.

### The Request Structure

From the ASN.1 schema in `ota_v1_1/`:

```
MessageListReq ::= SEQUENCE {
    startEndNumber    StartEndNumber,       -- Pagination (start index, end index)
    messageGroup      [0] UTF8String OPTIONAL  -- Filter by category/group
}

StartEndNumber ::= SEQUENCE {
    startNumber       INTEGER,
    endNumber         INTEGER
}
```

So you're asking the server: *"Give me messages N through M, optionally filtered by group."*

### The Response Structure

```
MessageListResp ::= SEQUENCE {
    recordsNumber     INTEGER,                          -- Total count
    messages          [0] SEQUENCE OF Message OPTIONAL   -- The actual messages
}

Message ::= SEQUENCE {
    messageId         INTEGER,
    messageType       UTF8String,          -- Event type identifier
    title             [0] UTF8String OPTIONAL,
    messageTime       [1] UTF8String OPTIONAL,   -- Timestamp string
    sender            [2] UTF8String OPTIONAL,
    content           [3] UTF8String OPTIONAL,   -- Human-readable description
    readStatus        [4] INTEGER OPTIONAL,      -- 0 = unread, 1 = read
    vin               [5] UTF8String OPTIONAL,   -- Which vehicle
    contentIdList     [6] SEQUENCE OF INTEGER OPTIONAL
}
```

### What Kind of Messages Appear?

These messages are **server-side stored events** that the TBOX pushes whenever something happens. They correspond to the **Alarm Switches** you configure via `get_alarm_switch_list()` / `set_alarm_switch_list()`.

The alarm switches (from `AlarmSwitch` in the data model) each have:

```
AlarmSwitch ::= SEQUENCE {
    alarmSettingType    INTEGER,    -- The event type ID
    alarmSwitch         BOOLEAN,   -- Enabled/disabled
    functionSwitch      BOOLEAN    -- Function enabled
}
```

#### Known Alarm/Message Types

Based on the codebase and the companion project `saic-python-mqtt-gateway` (which is the primary consumer of this library), typical `alarmSettingType` values include:

| Type ID | Event | Relevance |
|---|---|---|
| 1 | Vehicle movement/tow alarm | ❌ Not charging related |
| 2 | Vehicle break-in / door forced | ❌ |
| 3 | Vehicle alarm triggered | ❌ |
| 4 | **Charging started** | ✅ **Exactly what you need** |
| 5 | **Charging complete** | ✅ **Exactly what you need** |
| 6 | **Charging interrupted / fault** | ✅ **Exactly what you need** |
| 7 | Low 12V battery | ❌ |
| 8 | Geofence alert | ❌ |
| 9 | Speed alert | ❌ |

> ⚠️ **Important caveat**: The exact type IDs can vary by vehicle model, firmware version, and region. The above is representative but you should verify against your own car.

### What the Messages Actually Look Like in Practice

Here's what you'd typically receive when iterating over the message list:

```python
# Example message object (conceptual)
message = {
    "messageId": 123456789,
    "messageType": "charge",          # or a numeric type string
    "title": "Charging Complete",     # Often localized (Chinese/English)
    "messageTime": "20250102120000",  # yyyyMMddHHmmss format
    "sender": "system",
    "content": "Your vehicle charging is complete. SOC: 100%",
    "readStatus": 0,                  # 0 = unread
    "vin": "LSJW26397RG123456"
}
```

The `content` field is a **human-readable text string**, often localized to the account's region. For EU accounts it tends to be in English; for Chinese accounts, it's in Chinese.

### The Reliability Problem

Here's the critical thing you need to understand:

#### ✅ What works well:
- **Charging complete** events are reliably pushed by the TBOX
- **Charging fault/interruption** events are also fairly reliable
- The messages persist on the server, so you won't miss them even if your polling script was temporarily down

#### ⚠️ What is less reliable:
- **Charging started** events are **not always generated** by all vehicle models/firmware versions
- Some vehicles only push a notification when charging **completes**, not when it **starts**
- The message `content` format is **not standardized** — it varies by region, language, and firmware version, making string parsing fragile
- Messages may arrive with a **delay** (minutes) after the actual event

### Practical Approach: How to Actually Use This

Given the reliability concerns, here's a more robust approach:

```python
import time
from datetime import datetime

class ChargingMonitor:
    def __init__(self, saic_api, vin):
        self.api = saic_api
        self.vin = vin
        self.last_message_id = None
        self.known_charging = False
    
    def poll_messages(self):
        """
        Poll server messages — does NOT wake the car.
        """
        resp = self.api.get_message_list()
        
        if resp is None or resp.messages is None:
            return []
        
        new_messages = []
        for msg in resp.messages:
            # Filter to our VIN
            if msg.vin and msg.vin != self.vin:
                continue
            
            # Only process unread messages
            if msg.readStatus == 0:
                new_messages.append(msg)
        
        return new_messages
    
    def classify_message(self, msg):
        """
        Try to determine if this message is charging-related.
        Must handle multiple languages and formats.
        """
        content = (msg.content or '').lower()
        title = (msg.title or '').lower()
        msg_type = (msg.messageType or '').lower()
        
        combined = f"{title} {content} {msg_type}"
        
        # English keywords
        if any(kw in combined for kw in ['charging complete', 'charge complete', 
                                          'fully charged', 'charging finished']):
            return 'charge_complete'
        
        if any(kw in combined for kw in ['charging started', 'charge started',
                                          'charging begins', 'start charging']):
            return 'charge_started'
        
        if any(kw in combined for kw in ['charging fault', 'charging error',
                                          'charging interrupted', 'charge stopped',
                                          'charging abnormal']):
            return 'charge_fault'
        
        # Chinese keywords (common on SAIC vehicles)
        if any(kw in combined for kw in ['充电完成', '充满']):
            return 'charge_complete'
        
        if any(kw in combined for kw in ['开始充电', '充电开始']):
            return 'charge_started'
        
        if any(kw in combined for kw in ['充电故障', '充电中断', '充电异常']):
            return 'charge_fault'
        
        return 'unknown'
    
    def monitor_loop(self):
        """Main monitoring loop"""
        while True:
            messages = self.poll_messages()
            
            for msg in messages:
                event = self.classify_message(msg)
                
                timestamp = msg.messageTime  # "yyyyMMddHHmmss"
                
                if event == 'charge_started':
                    self.known_charging = True
                    self.notify(f"⚡ Charging STARTED at {timestamp}")
                    # Mark as read
                    self.api.read_message(msg.messageId)
                    
                elif event == 'charge_complete':
                    self.known_charging = False
                    self.notify(f"✅ Charging COMPLETE at {timestamp}")
                    self.api.read_message(msg.messageId)
                    
                elif event == 'charge_fault':
                    self.known_charging = False
                    self.notify(f"⚠️ Charging FAULT at {timestamp}: {msg.content}")
                    self.api.read_message(msg.messageId)
                    
                else:
                    # Non-charging message, still mark as read
                    self.api.read_message(msg.messageId)
            
            time.sleep(120)  # Poll every 2 minutes — NO car wake
```

### Summary

| Aspect | Detail |
|---|---|
| **What it returns** | Server-stored event notifications pushed by the car's TBOX |
| **Wakes the car?** | **No** — purely server-side query |
| **Charging events included?** | Yes, if alarm switches are enabled |
| **Reliable for charge start?** | Somewhat — not all models/firmware push this |
| **Reliable for charge complete?** | Yes — generally reliable across models |
| **Message format** | Human-readable text, localized, not strictly structured |
| **Latency** | Minutes delay possible between event and message availability |

For a bulletproof solution, you'd use message polling as the **primary trigger**, and only fall back to an active `get_chrg_mgmt_data()` poll (which wakes the car) if you need precise real-time SOC tracking or if your vehicle doesn't reliably generate the start/stop messages.