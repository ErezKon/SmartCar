# Signal Codes Reference

Smartcar provides access to 94 real-time vehicle signals via the Smartcar API v3. Signals represent live data points read from a connected vehicle, organized into 18 logical groups. Each signal is identified by a unique code in the format `group-name` (lowercase, hyphen-separated).

This document catalogs every available signal code along with its description.

---

## Charge (21 signals)

| Signal Code | Description |
|---|---|
| `charge-amperage` | Current charging amperage |
| `charge-amperagemax` | Maximum supported charging amperage |
| `charge-amperagerequested` | Requested charging amperage |
| `charge-chargelimits` | Charge limit settings (SOC percentage) |
| `charge-chargeportstatuscolor` | Charge port status LED color |
| `charge-chargerate` | Current charge rate (kW or miles/hr) |
| `charge-chargerecords` | Historical charge session records |
| `charge-chargerphases` | Number of charger phases in use |
| `charge-chargetimers` | Scheduled charge timer settings |
| `charge-chargingconnectortype` | Type of charging connector (CCS, Type 2, etc.) |
| `charge-detailedchargingstatus` | Detailed charging status information |
| `charge-energyadded` | Energy added during current charge session (kWh) |
| `charge-fastchargertype` | Type of fast charger connected |
| `charge-ischarging` | Whether the vehicle is currently charging |
| `charge-ischargingcableconnected` | Whether a charging cable is physically connected |
| `charge-ischargingcablelatched` | Whether the charging cable is latched/locked |
| `charge-ischargingportflapopen` | Whether the charge port flap is open |
| `charge-isfastchargerpresent` | Whether a fast charger (DC) is connected |
| `charge-timetocomplete` | Estimated time to complete charging |
| `charge-voltage` | Current charging voltage |
| `charge-wattage` | Current charging wattage (power) |

## Climate (2 signals)

| Signal Code | Description |
|---|---|
| `climate-externaltemperature` | External/ambient temperature |
| `climate-internaltemperature` | Internal/cabin temperature |

## Closure (8 signals)

| Signal Code | Description |
|---|---|
| `closure-doors` | Door open/closed status for all doors |
| `closure-enginecover` | Engine cover/hood open/closed status |
| `closure-fronttrunk` | Front trunk (frunk) open/closed status |
| `closure-islocked` | Whether the vehicle is locked |
| `closure-reartrunk` | Rear trunk/boot open/closed status |
| `closure-sunroof` | Sunroof open/closed/tilt status |
| `closure-tailgate` | Tailgate open/closed status |
| `closure-windows` | Window open/closed status for all windows |

## ConnectivitySoftware (1 signal)

| Signal Code | Description |
|---|---|
| `connectivitysoftware-currentfirmwareversion` | Current firmware/software version |

## ConnectivityStatus (3 signals)

| Signal Code | Description |
|---|---|
| `connectivitystatus-isasleep` | Whether the vehicle is in sleep mode |
| `connectivitystatus-isdigitalkeypaired` | Whether a digital key is paired |
| `connectivitystatus-isonline` | Whether the vehicle is online/connected |

## Diagnostics (23 signals)

| Signal Code | Description |
|---|---|
| `diagnostics-abs` | Anti-lock braking system status |
| `diagnostics-activesafety` | Active safety system status |
| `diagnostics-airbag` | Airbag system status |
| `diagnostics-brakefluid` | Brake fluid level/status |
| `diagnostics-driverassistance` | Driver assistance system status |
| `diagnostics-dtccount` | Number of diagnostic trouble codes |
| `diagnostics-dtclist` | List of diagnostic trouble codes |
| `diagnostics-emissions` | Emissions system status |
| `diagnostics-evbatteryconditioning` | EV battery conditioning status |
| `diagnostics-evcharging` | EV charging system diagnostics |
| `diagnostics-evdriveunit` | EV drive unit/motor diagnostics |
| `diagnostics-evhvbattery` | EV high-voltage battery diagnostics |
| `diagnostics-lighting` | Lighting system status |
| `diagnostics-mil` | Malfunction indicator lamp (check engine) status |
| `diagnostics-oillife` | Engine oil life remaining |
| `diagnostics-oilpressure` | Engine oil pressure status |
| `diagnostics-oiltemperature` | Engine oil temperature |
| `diagnostics-telematics` | Telematics system status |
| `diagnostics-tirepressure` | Tire pressure readings for all tires |
| `diagnostics-tirepressuremonitoring` | Tire pressure monitoring system status |
| `diagnostics-transmission` | Transmission system diagnostics |
| `diagnostics-washerfluid` | Windshield washer fluid level |
| `diagnostics-waterinfuel` | Water in fuel detected status |

## HVAC (5 signals)

| Signal Code | Description |
|---|---|
| `hvac-cabintargettemperature` | Target cabin temperature setting |
| `hvac-iscabinhvacactive` | Whether cabin HVAC is active |
| `hvac-isfrontdefrosteractive` | Whether front defroster is active |
| `hvac-isreardefrosteractive` | Whether rear defroster is active |
| `hvac-issteeringheateractive` | Whether steering wheel heater is active |

## InternalCombustionEngine (4 signals)

| Signal Code | Description |
|---|---|
| `internalcombustionengine-amountremaining` | Fuel amount remaining (liters/gallons) |
| `internalcombustionengine-fuellevel` | Fuel level as percentage |
| `internalcombustionengine-oillife` | Engine oil life remaining percentage |
| `internalcombustionengine-range` | Estimated remaining range on fuel |

## Location (2 signals)

| Signal Code | Description |
|---|---|
| `location-isathome` | Whether the vehicle is at its home location |
| `location-preciselocation` | Precise GPS coordinates (latitude, longitude) |

## LowVoltageBattery (2 signals)

| Signal Code | Description |
|---|---|
| `lowvoltagebattery-stateofcharge` | 12V battery state of charge |
| `lowvoltagebattery-status` | 12V battery health status |

## Motion (1 signal)

| Signal Code | Description |
|---|---|
| `motion-currentspeed` | Current vehicle speed |

## Odometer (1 signal)

| Signal Code | Description |
|---|---|
| `odometer-traveleddistance` | Total distance traveled (odometer reading) |

## Service (2 signals)

| Signal Code | Description |
|---|---|
| `service-isinservice` | Whether the vehicle is currently in service |
| `service-records` | Vehicle service history records |

## Surveillance (2 signals)

| Signal Code | Description |
|---|---|
| `surveillance-brand` | Brand of surveillance/dashcam system |
| `surveillance-isenabled` | Whether surveillance/sentry mode is enabled |

## TractionBattery (5 signals)

| Signal Code | Description |
|---|---|
| `tractionbattery-isheateractive` | Whether the traction battery heater is active |
| `tractionbattery-maxrangechargecounter` | Max range charge counter |
| `tractionbattery-nominalcapacity` | Nominal battery capacity (kWh) |
| `tractionbattery-range` | Estimated remaining range on battery |
| `tractionbattery-stateofcharge` | Traction battery state of charge percentage |

## Transmission (2 signals)

| Signal Code | Description |
|---|---|
| `transmission-drivemode` | Current drive mode (Eco, Normal, Sport, etc.) |
| `transmission-gearstate` | Current gear state (Park, Drive, Reverse, Neutral) |

## VehicleIdentification (5 signals)

| Signal Code | Description |
|---|---|
| `vehicleidentification-exteriorcolor` | Vehicle exterior color |
| `vehicleidentification-nickname` | User-assigned vehicle nickname |
| `vehicleidentification-packages` | Installed option packages |
| `vehicleidentification-trim` | Vehicle trim level |
| `vehicleidentification-vin` | Vehicle identification number (VIN) |

## VehicleUserAccount (2 signals)

| Signal Code | Description |
|---|---|
| `vehicleuseraccount-permissions` | User permissions for the vehicle |
| `vehicleuseraccount-role` | User role (owner, driver, etc.) |

## Wheel (2 signals)

| Signal Code | Description |
|---|---|
| `wheel-style` | Wheel style/type |
| `wheel-tires` | Tire specifications and pressure |

---

## Accessing Signals

### Via API

Retrieve all signals for a vehicle:

```
GET /api/vehicles/{vehicleId}/signals
Header: sc-user-id: {userId}
```

Retrieve a single signal by code:

```
GET /api/vehicles/{vehicleId}/signals/{signalCode}
Header: sc-user-id: {userId}
```

Retrieve the full signal catalog:

```
GET /api/vehicles/signals/catalog
```

Retrieve signal history from the local cache:

```
GET /api/vehicles/{vehicleId}/signals-history?signalCode={signalCode}
```

### Via CLI

```sh
# Browse the full signal catalog
smartcar vehicle catalog

# Filter catalog by group
smartcar vehicle catalog --group Charge

# Read all signals from a vehicle
smartcar vehicle signals <vehicleId> --user-id <userId>

# Read a single signal
smartcar vehicle signal <vehicleId> charge-ischarging --user-id <userId>

# View cached signal history
smartcar vehicle history <vehicleId> --signal charge-ischarging
```

Add `--json` to any of the above commands to get raw JSON output.
