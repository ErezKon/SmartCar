export interface SignalCodeInfo {
  code: string;
  group: string;
  description: string;
}

export const SIGNAL_CODE_CATALOG: Record<string, SignalCodeInfo> = {
  // Charge Signals (21)
  'charge-amperage': { code: 'charge-amperage', group: 'Charge', description: 'Current charging amperage' },
  'charge-amperagemax': { code: 'charge-amperagemax', group: 'Charge', description: 'Maximum supported charging amperage' },
  'charge-amperagerequested': { code: 'charge-amperagerequested', group: 'Charge', description: 'Requested charging amperage' },
  'charge-chargelimits': { code: 'charge-chargelimits', group: 'Charge', description: 'Charge limit settings (SOC percentage)' },
  'charge-chargeportstatuscolor': { code: 'charge-chargeportstatuscolor', group: 'Charge', description: 'Charge port status LED color' },
  'charge-chargerate': { code: 'charge-chargerate', group: 'Charge', description: 'Current charge rate (kW or miles/hr)' },
  'charge-chargerecords': { code: 'charge-chargerecords', group: 'Charge', description: 'Historical charge session records' },
  'charge-chargerphases': { code: 'charge-chargerphases', group: 'Charge', description: 'Number of charger phases in use' },
  'charge-chargetimers': { code: 'charge-chargetimers', group: 'Charge', description: 'Scheduled charge timer settings' },
  'charge-chargingconnectortype': { code: 'charge-chargingconnectortype', group: 'Charge', description: 'Type of charging connector (CCS, Type 2, etc.)' },
  'charge-detailedchargingstatus': { code: 'charge-detailedchargingstatus', group: 'Charge', description: 'Detailed charging status information' },
  'charge-energyadded': { code: 'charge-energyadded', group: 'Charge', description: 'Energy added during current charge session (kWh)' },
  'charge-fastchargertype': { code: 'charge-fastchargertype', group: 'Charge', description: 'Type of fast charger connected' },
  'charge-ischarging': { code: 'charge-ischarging', group: 'Charge', description: 'Whether the vehicle is currently charging' },
  'charge-ischargingcableconnected': { code: 'charge-ischargingcableconnected', group: 'Charge', description: 'Whether a charging cable is physically connected' },
  'charge-ischargingcablelatched': { code: 'charge-ischargingcablelatched', group: 'Charge', description: 'Whether the charging cable is latched/locked' },
  'charge-ischargingportflapopen': { code: 'charge-ischargingportflapopen', group: 'Charge', description: 'Whether the charge port flap is open' },
  'charge-isfastchargerpresent': { code: 'charge-isfastchargerpresent', group: 'Charge', description: 'Whether a fast charger (DC) is connected' },
  'charge-timetocomplete': { code: 'charge-timetocomplete', group: 'Charge', description: 'Estimated time to complete charging' },
  'charge-voltage': { code: 'charge-voltage', group: 'Charge', description: 'Current charging voltage' },
  'charge-wattage': { code: 'charge-wattage', group: 'Charge', description: 'Current charging wattage (power)' },

  // Climate Signals (2)
  'climate-externaltemperature': { code: 'climate-externaltemperature', group: 'Climate', description: 'External/ambient temperature' },
  'climate-internaltemperature': { code: 'climate-internaltemperature', group: 'Climate', description: 'Internal/cabin temperature' },

  // Closure Signals (8)
  'closure-doors': { code: 'closure-doors', group: 'Closure', description: 'Door open/closed status for all doors' },
  'closure-enginecover': { code: 'closure-enginecover', group: 'Closure', description: 'Engine cover/hood open/closed status' },
  'closure-fronttrunk': { code: 'closure-fronttrunk', group: 'Closure', description: 'Front trunk (frunk) open/closed status' },
  'closure-islocked': { code: 'closure-islocked', group: 'Closure', description: 'Whether the vehicle is locked' },
  'closure-reartrunk': { code: 'closure-reartrunk', group: 'Closure', description: 'Rear trunk/boot open/closed status' },
  'closure-sunroof': { code: 'closure-sunroof', group: 'Closure', description: 'Sunroof open/closed/tilt status' },
  'closure-tailgate': { code: 'closure-tailgate', group: 'Closure', description: 'Tailgate open/closed status' },
  'closure-windows': { code: 'closure-windows', group: 'Closure', description: 'Window open/closed status for all windows' },

  // ConnectivitySoftware (1)
  'connectivitysoftware-currentfirmwareversion': { code: 'connectivitysoftware-currentfirmwareversion', group: 'ConnectivitySoftware', description: 'Current firmware/software version' },

  // ConnectivityStatus (3)
  'connectivitystatus-isasleep': { code: 'connectivitystatus-isasleep', group: 'ConnectivityStatus', description: 'Whether the vehicle is in sleep mode' },
  'connectivitystatus-isdigitalkeypaired': { code: 'connectivitystatus-isdigitalkeypaired', group: 'ConnectivityStatus', description: 'Whether a digital key is paired' },
  'connectivitystatus-isonline': { code: 'connectivitystatus-isonline', group: 'ConnectivityStatus', description: 'Whether the vehicle is online/connected' },

  // Diagnostics (23)
  'diagnostics-abs': { code: 'diagnostics-abs', group: 'Diagnostics', description: 'Anti-lock braking system status' },
  'diagnostics-activesafety': { code: 'diagnostics-activesafety', group: 'Diagnostics', description: 'Active safety system status' },
  'diagnostics-airbag': { code: 'diagnostics-airbag', group: 'Diagnostics', description: 'Airbag system status' },
  'diagnostics-brakefluid': { code: 'diagnostics-brakefluid', group: 'Diagnostics', description: 'Brake fluid level/status' },
  'diagnostics-driverassistance': { code: 'diagnostics-driverassistance', group: 'Diagnostics', description: 'Driver assistance system status' },
  'diagnostics-dtccount': { code: 'diagnostics-dtccount', group: 'Diagnostics', description: 'Number of diagnostic trouble codes' },
  'diagnostics-dtclist': { code: 'diagnostics-dtclist', group: 'Diagnostics', description: 'List of diagnostic trouble codes' },
  'diagnostics-emissions': { code: 'diagnostics-emissions', group: 'Diagnostics', description: 'Emissions system status' },
  'diagnostics-evbatteryconditioning': { code: 'diagnostics-evbatteryconditioning', group: 'Diagnostics', description: 'EV battery conditioning status' },
  'diagnostics-evcharging': { code: 'diagnostics-evcharging', group: 'Diagnostics', description: 'EV charging system diagnostics' },
  'diagnostics-evdriveunit': { code: 'diagnostics-evdriveunit', group: 'Diagnostics', description: 'EV drive unit/motor diagnostics' },
  'diagnostics-evhvbattery': { code: 'diagnostics-evhvbattery', group: 'Diagnostics', description: 'EV high-voltage battery diagnostics' },
  'diagnostics-lighting': { code: 'diagnostics-lighting', group: 'Diagnostics', description: 'Lighting system status' },
  'diagnostics-mil': { code: 'diagnostics-mil', group: 'Diagnostics', description: 'Malfunction indicator lamp (check engine) status' },
  'diagnostics-oillife': { code: 'diagnostics-oillife', group: 'Diagnostics', description: 'Engine oil life remaining' },
  'diagnostics-oilpressure': { code: 'diagnostics-oilpressure', group: 'Diagnostics', description: 'Engine oil pressure status' },
  'diagnostics-oiltemperature': { code: 'diagnostics-oiltemperature', group: 'Diagnostics', description: 'Engine oil temperature' },
  'diagnostics-telematics': { code: 'diagnostics-telematics', group: 'Diagnostics', description: 'Telematics system status' },
  'diagnostics-tirepressure': { code: 'diagnostics-tirepressure', group: 'Diagnostics', description: 'Tire pressure readings for all tires' },
  'diagnostics-tirepressuremonitoring': { code: 'diagnostics-tirepressuremonitoring', group: 'Diagnostics', description: 'Tire pressure monitoring system status' },
  'diagnostics-transmission': { code: 'diagnostics-transmission', group: 'Diagnostics', description: 'Transmission system diagnostics' },
  'diagnostics-washerfluid': { code: 'diagnostics-washerfluid', group: 'Diagnostics', description: 'Windshield washer fluid level' },
  'diagnostics-waterinfuel': { code: 'diagnostics-waterinfuel', group: 'Diagnostics', description: 'Water in fuel detected status' },

  // HVAC (5)
  'hvac-cabintargettemperature': { code: 'hvac-cabintargettemperature', group: 'HVAC', description: 'Target cabin temperature setting' },
  'hvac-iscabinhvacactive': { code: 'hvac-iscabinhvacactive', group: 'HVAC', description: 'Whether cabin HVAC is active' },
  'hvac-isfrontdefrosteractive': { code: 'hvac-isfrontdefrosteractive', group: 'HVAC', description: 'Whether front defroster is active' },
  'hvac-isreardefrosteractive': { code: 'hvac-isreardefrosteractive', group: 'HVAC', description: 'Whether rear defroster is active' },
  'hvac-issteeringheateractive': { code: 'hvac-issteeringheateractive', group: 'HVAC', description: 'Whether steering wheel heater is active' },

  // InternalCombustionEngine (4)
  'internalcombustionengine-amountremaining': { code: 'internalcombustionengine-amountremaining', group: 'InternalCombustionEngine', description: 'Fuel amount remaining (liters/gallons)' },
  'internalcombustionengine-fuellevel': { code: 'internalcombustionengine-fuellevel', group: 'InternalCombustionEngine', description: 'Fuel level as percentage' },
  'internalcombustionengine-oillife': { code: 'internalcombustionengine-oillife', group: 'InternalCombustionEngine', description: 'Engine oil life remaining percentage' },
  'internalcombustionengine-range': { code: 'internalcombustionengine-range', group: 'InternalCombustionEngine', description: 'Estimated remaining range on fuel' },

  // Location (2)
  'location-isathome': { code: 'location-isathome', group: 'Location', description: 'Whether the vehicle is at its home location' },
  'location-preciselocation': { code: 'location-preciselocation', group: 'Location', description: 'Precise GPS coordinates (latitude, longitude)' },

  // LowVoltageBattery (2)
  'lowvoltagebattery-stateofcharge': { code: 'lowvoltagebattery-stateofcharge', group: 'LowVoltageBattery', description: '12V battery state of charge' },
  'lowvoltagebattery-status': { code: 'lowvoltagebattery-status', group: 'LowVoltageBattery', description: '12V battery health status' },

  // Motion (1)
  'motion-currentspeed': { code: 'motion-currentspeed', group: 'Motion', description: 'Current vehicle speed' },

  // Odometer (1)
  'odometer-traveleddistance': { code: 'odometer-traveleddistance', group: 'Odometer', description: 'Total distance traveled (odometer reading)' },

  // Service (2)
  'service-isinservice': { code: 'service-isinservice', group: 'Service', description: 'Whether the vehicle is currently in service' },
  'service-records': { code: 'service-records', group: 'Service', description: 'Vehicle service history records' },

  // Surveillance (2)
  'surveillance-brand': { code: 'surveillance-brand', group: 'Surveillance', description: 'Brand of surveillance/dashcam system' },
  'surveillance-isenabled': { code: 'surveillance-isenabled', group: 'Surveillance', description: 'Whether surveillance/sentry mode is enabled' },

  // TractionBattery (5)
  'tractionbattery-isheateractive': { code: 'tractionbattery-isheateractive', group: 'TractionBattery', description: 'Whether the traction battery heater is active' },
  'tractionbattery-maxrangechargecounter': { code: 'tractionbattery-maxrangechargecounter', group: 'TractionBattery', description: 'Max range charge counter' },
  'tractionbattery-nominalcapacity': { code: 'tractionbattery-nominalcapacity', group: 'TractionBattery', description: 'Nominal battery capacity (kWh)' },
  'tractionbattery-range': { code: 'tractionbattery-range', group: 'TractionBattery', description: 'Estimated remaining range on battery' },
  'tractionbattery-stateofcharge': { code: 'tractionbattery-stateofcharge', group: 'TractionBattery', description: 'Traction battery state of charge percentage' },

  // Transmission (2)
  'transmission-drivemode': { code: 'transmission-drivemode', group: 'Transmission', description: 'Current drive mode (Eco, Normal, Sport, etc.)' },
  'transmission-gearstate': { code: 'transmission-gearstate', group: 'Transmission', description: 'Current gear state (Park, Drive, Reverse, Neutral)' },

  // VehicleIdentification (5)
  'vehicleidentification-exteriorcolor': { code: 'vehicleidentification-exteriorcolor', group: 'VehicleIdentification', description: 'Vehicle exterior color' },
  'vehicleidentification-nickname': { code: 'vehicleidentification-nickname', group: 'VehicleIdentification', description: 'User-assigned vehicle nickname' },
  'vehicleidentification-packages': { code: 'vehicleidentification-packages', group: 'VehicleIdentification', description: 'Installed option packages' },
  'vehicleidentification-trim': { code: 'vehicleidentification-trim', group: 'VehicleIdentification', description: 'Vehicle trim level' },
  'vehicleidentification-vin': { code: 'vehicleidentification-vin', group: 'VehicleIdentification', description: 'Vehicle identification number (VIN)' },

  // VehicleUserAccount (2)
  'vehicleuseraccount-permissions': { code: 'vehicleuseraccount-permissions', group: 'VehicleUserAccount', description: 'User permissions for the vehicle' },
  'vehicleuseraccount-role': { code: 'vehicleuseraccount-role', group: 'VehicleUserAccount', description: 'User role (owner, driver, etc.)' },

  // Wheel (2)
  'wheel-style': { code: 'wheel-style', group: 'Wheel', description: 'Wheel style/type' },
  'wheel-tires': { code: 'wheel-tires', group: 'Wheel', description: 'Tire specifications and pressure' },
};

export function getSignalsByGroup(): Record<string, SignalCodeInfo[]> {
  const groups: Record<string, SignalCodeInfo[]> = {};
  for (const signal of Object.values(SIGNAL_CODE_CATALOG)) {
    if (!groups[signal.group]) {
      groups[signal.group] = [];
    }
    groups[signal.group].push(signal);
  }
  return groups;
}

export function isValidSignalCode(code: string): boolean {
  return code in SIGNAL_CODE_CATALOG;
}

export function getSignalInfo(code: string): SignalCodeInfo | undefined {
  return SIGNAL_CODE_CATALOG[code];
}

export function getAllSignalCodes(): string[] {
  return Object.keys(SIGNAL_CODE_CATALOG);
}
