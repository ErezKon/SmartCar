# CLI Command Reference

The `smartcar` CLI provides a terminal interface for interacting with connected vehicles through the Smartcar backend API. It supports authentication, vehicle data retrieval, remote commands, webhook management, and more.

---

## Getting Started

### Prerequisites

The CLI communicates with the Smartcar backend API server. The backend must be running before using any CLI commands.

By default, the CLI connects to `http://localhost:3000`. To point at a different backend, set the `SMARTCAR_API_URL` environment variable:

```sh
export SMARTCAR_API_URL=http://192.168.1.50:3000
```

### Common Flags

Several flags appear across multiple commands:

| Flag | Description |
|---|---|
| `--user-id <userId>` | Sets the `sc-user-id` header. Required for most vehicle operations. |
| `--json` | Outputs raw JSON instead of formatted tables. |

---

## auth

Authentication and connection management.

### auth status

Show current authentication status, including token info and connected users.

```sh
smartcar auth status
```

### auth connect

Generate a Smartcar Connect URL to authorize a vehicle.

```sh
smartcar auth connect [options]
```

| Option | Description | Default |
|---|---|---|
| `--mode <mode>` | Connection mode (`simulated` or `live`) | `simulated` |
| `--make <make>` | Filter by vehicle make | -- |
| `--single` | Single vehicle selection mode | -- |

**Example:**

```sh
smartcar auth connect --mode simulated --make TESLA --single
```

### auth token

Show current token information, or force a token refresh.

```sh
smartcar auth token [options]
```

| Option | Description |
|---|---|
| `--refresh` | Force a token refresh |

**Example:**

```sh
smartcar auth token --refresh
```

---

## connections

Manage vehicle connections.

### connections list

List all vehicle connections with optional filters and pagination.

```sh
smartcar connections list [options]
```

| Option | Description | Default |
|---|---|---|
| `--user-id <userId>` | Filter by user ID | -- |
| `--vehicle-id <vehicleId>` | Filter by vehicle ID | -- |
| `--mode <mode>` | Filter by vehicle mode (`simulated` or `live`) | -- |
| `--page <number>` | Page number | `1` |
| `--size <number>` | Page size | `10` |

**Example:**

```sh
smartcar connections list --user-id user-123 --mode simulated
```

### connections get

Get details for a specific connection.

```sh
smartcar connections get <connectionId>
```

**Example:**

```sh
smartcar connections get conn-abc-123
```

### connections remove

Remove a connection by its ID.

```sh
smartcar connections remove <connectionId>
```

### connections remove-user

Remove a user and all their associated connections.

```sh
smartcar connections remove-user <userId>
```

---

## vehicle

Vehicle information and signal data.

### vehicle info

Show vehicle attributes (make, model, year, powertrain).

```sh
smartcar vehicle info <vehicleId> [options]
```

| Option | Description |
|---|---|
| `--user-id <userId>` | User ID (`sc-user-id` header) |
| `--json` | Output raw JSON |

**Example:**

```sh
smartcar vehicle info vehicle-abc --user-id user-123
```

### vehicle signals

Show all signal values for a vehicle.

```sh
smartcar vehicle signals <vehicleId> --user-id <userId> [options]
```

| Option | Description |
|---|---|
| `--user-id <userId>` | User ID (required) |
| `--json` | Output raw JSON |

**Example:**

```sh
smartcar vehicle signals vehicle-abc --user-id user-123
```

### vehicle signal

Show the value of a specific signal.

```sh
smartcar vehicle signal <vehicleId> <signalCode> --user-id <userId> [options]
```

| Option | Description |
|---|---|
| `--user-id <userId>` | User ID (required) |
| `--json` | Output raw JSON |

**Example:**

```sh
smartcar vehicle signal vehicle-abc tractionbattery-stateofcharge --user-id user-123
```

### vehicle history

Show signal history from the local cache.

```sh
smartcar vehicle history <vehicleId> [options]
```

| Option | Description |
|---|---|
| `--signal <signalCode>` | Filter by signal code |
| `--json` | Output raw JSON |

**Example:**

```sh
smartcar vehicle history vehicle-abc --signal charge-ischarging --json
```

### vehicle catalog

Show the full signal codes catalog, optionally filtered by group.

```sh
smartcar vehicle catalog [options]
```

| Option | Description |
|---|---|
| `--group <group>` | Filter by signal group name |
| `--json` | Output raw JSON |

**Example:**

```sh
smartcar vehicle catalog --group Diagnostics
```

---

## charge

Charging controls for electric vehicles.

### charge start

Start charging.

```sh
smartcar charge start <vehicleId> --user-id <userId>
```

**Example:**

```sh
smartcar charge start vehicle-abc --user-id user-123
```

### charge stop

Stop charging.

```sh
smartcar charge stop <vehicleId> --user-id <userId>
```

### charge limit

Set the charge limit percentage (0-100).

```sh
smartcar charge limit <vehicleId> <percent> --user-id <userId>
```

**Example:**

```sh
smartcar charge limit vehicle-abc 80 --user-id user-123
```

### charge status

Show charging-related signals for a vehicle. Fetches a curated set of charge and battery signals including charge state, rate, voltage, wattage, amperage, energy added, time to complete, battery SOC, and range.

```sh
smartcar charge status <vehicleId> --user-id <userId>
```

---

## lock / unlock

Door security commands. These are top-level commands (not subcommands of a group).

### lock

Lock all doors.

```sh
smartcar lock <vehicleId> --user-id <userId>
```

### unlock

Unlock all doors.

```sh
smartcar unlock <vehicleId> --user-id <userId>
```

**Example:**

```sh
smartcar lock vehicle-abc --user-id user-123
smartcar unlock vehicle-abc --user-id user-123
```

---

## nav

Navigation controls.

### nav set

Set a navigation destination by GPS coordinates. Latitude must be between -90 and 90. Longitude must be between -180 and 180.

```sh
smartcar nav set <vehicleId> <latitude> <longitude> --user-id <userId>
```

**Example:**

```sh
smartcar nav set vehicle-abc 37.7749 -122.4194 --user-id user-123
```

---

## schedule

Charge schedule management. Schedule commands use interactive prompts to collect time and day inputs.

### schedule daily

Set a daily charge schedule. Prompts for start time, end time (HH:mm format), and whether to enable the schedule.

```sh
smartcar schedule daily <vehicleId> --user-id <userId>
```

### schedule weekly

Set a weekly charge schedule. Prompts for days of the week, start time, end time, and enabled state.

```sh
smartcar schedule weekly <vehicleId> --user-id <userId>
```

### schedule workweek

Set a workweek (Monday-Friday) charge schedule. Prompts for start time, end time, and enabled state.

```sh
smartcar schedule workweek <vehicleId> --user-id <userId>
```

### schedule delete

Delete a charge schedule by ID.

```sh
smartcar schedule delete <vehicleId> <scheduleId> --user-id <userId>
```

**Example:**

```sh
smartcar schedule delete vehicle-abc sched-456 --user-id user-123
```

---

## webhooks

Webhook management.

### webhooks list

List all configured webhooks.

```sh
smartcar webhooks list [options]
```

| Option | Description |
|---|---|
| `--json` | Output raw JSON |

### webhooks get

Get details for a specific webhook.

```sh
smartcar webhooks get <webhookId> [options]
```

| Option | Description |
|---|---|
| `--json` | Output raw JSON |

### webhooks events

Show recent webhook events from the local event log.

```sh
smartcar webhooks events [options]
```

| Option | Description | Default |
|---|---|---|
| `--limit <n>` | Number of events to return | `20` |
| `--offset <n>` | Offset for pagination | `0` |
| `--type <eventType>` | Filter by event type | -- |
| `--json` | Output raw JSON | -- |

**Example:**

```sh
smartcar webhooks events --limit 50 --type schedule.charge
```

---

## subscriptions

Webhook subscription management.

### subscriptions list

List webhook subscriptions with optional filters.

```sh
smartcar subscriptions list [options]
```

| Option | Description |
|---|---|
| `--webhook-id <webhookId>` | Filter by webhook ID |
| `--vehicle-id <vehicleId>` | Filter by vehicle ID |
| `--user-id <userId>` | Filter by user ID |
| `--page <n>` | Page number |
| `--size <n>` | Page size |
| `--json` | Output raw JSON |

### subscriptions create

Create a webhook subscription. This command uses interactive prompts to collect the webhook ID, user ID, and vehicle ID.

```sh
smartcar subscriptions create
```

### subscriptions get

Get details for a specific subscription.

```sh
smartcar subscriptions get <subscriptionId> [options]
```

| Option | Description |
|---|---|
| `--json` | Output raw JSON |

### subscriptions remove

Remove a subscription by its ID.

```sh
smartcar subscriptions remove <subscriptionId>
```

**Example:**

```sh
smartcar subscriptions remove sub-789
```

---

## compat

Vehicle compatibility checks.

### compat check

Check MG4 BEV compatibility.

```sh
smartcar compat check [options]
```

| Option | Description |
|---|---|
| `--json` | Output raw JSON |

### compat search

Search vehicle compatibility with filters.

```sh
smartcar compat search [options]
```

| Option | Description |
|---|---|
| `--make <make>` | Filter by vehicle make |
| `--region <region>` | Filter by region (`US`, `CA`, `EUROPE`) |
| `--powertrain <type>` | Filter by powertrain type (`ICE`, `BEV`, `PHEV`, `EV`) |
| `--json` | Output raw JSON |

**Example:**

```sh
smartcar compat search --make TESLA --region US --powertrain BEV
```

---

## saic

SAIC / MG iSmart direct integration commands. These bypass Smartcar and communicate directly with the SAIC iSmart API.

### saic login

Connect a SAIC iSmart account. Credentials are encrypted and stored locally.

```sh
smartcar saic login --username <email> --password <password> [options]
```

| Option | Description |
|---|---|
| `--username <email>` | SAIC account email or phone (required) |
| `--password <password>` | SAIC account password (required) |
| `--region <region>` | Region code: eu, au, tr, il, br, in, th, cn (default: il) |

### saic logout

Disconnect the SAIC account and remove stored credentials.

```sh
smartcar saic logout
```

### saic status

Show SAIC account connection status.

```sh
smartcar saic status [options]
```

| Option | Description |
|---|---|
| `--json` | Output raw JSON |

### saic vehicles

List vehicles registered to the SAIC account.

```sh
smartcar saic vehicles [options]
```

| Option | Description |
|---|---|
| `--json` | Output raw JSON |

### saic vehicle-status

Get vehicle status (cached by default).

```sh
smartcar saic vehicle-status <vin> [options]
```

| Option | Description |
|---|---|
| `--refresh` | Force live refresh (wakes the car, drains 12V battery) |
| `--json` | Output raw JSON |

### saic signals

Get normalized signals (combined status + charging data).

```sh
smartcar saic signals <vin> [options]
```

| Option | Description |
|---|---|
| `--refresh` | Force live refresh |
| `--json` | Output raw JSON |

### saic charge

Charging controls.

```sh
smartcar saic charge start <vin>         # Start charging
smartcar saic charge stop <vin>          # Stop charging
smartcar saic charge limit <vin> <pct>   # Set charge limit (40/50/60/70/80/90/100)
smartcar saic charge current <vin> <lvl> # Set charge current (6A/8A/16A/Max)
```

### saic lock / unlock

Lock or unlock the vehicle.

```sh
smartcar saic lock <vin>
smartcar saic unlock <vin> [options]
```

| Option | Description |
|---|---|
| `--tailgate` | Unlock tailgate instead of doors |

### saic climate

Start or stop climate control.

```sh
smartcar saic climate <vin> [options]
```

| Option | Description |
|---|---|
| `--stop` | Stop climate instead of starting |
| `--temp <degrees>` | Target temperature in Celsius, 17-33 (default: 22) |
| `--fan <speed>` | Fan speed: 1 (low), 2 (med), 3 (high), 5 (defrost) (default: 2) |

### saic find

Activate horn and lights to locate the vehicle.

```sh
smartcar saic find <vin>
```

### saic messages

Get alarm/command/news messages.

```sh
smartcar saic messages [options]
```

| Option | Description |
|---|---|
| `--group <group>` | Message group: ALARM, COMMAND, NEWS (default: ALARM) |
| `--page <n>` | Page number (default: 1) |
| `--size <n>` | Page size (default: 20) |
| `--json` | Output raw JSON |

### saic history

Get command execution history for a vehicle.

```sh
smartcar saic history <vin> [options]
```

| Option | Description |
|---|---|
| `--limit <n>` | Max results (default: 20) |
| `--json` | Output raw JSON |
