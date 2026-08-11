export const SMARTCAR_AUTH_URL = 'https://iam.smartcar.com';
export const SMARTCAR_VEHICLE_API_URL = 'https://vehicle.api.smartcar.com/v3';
export const SMARTCAR_MANAGEMENT_API_URL = 'https://management.api.smartcar.com/v3';
export const SMARTCAR_COMPATIBILITY_API_URL = 'https://compatibility.api.smartcar.com/v3';
export const SMARTCAR_CONNECT_URL = 'https://connect.smartcar.com/oauth/authorize';

export const TOKEN_REFRESH_BUFFER_SECONDS = 600; // refresh 10 min before expiry

export const SIGNAL_GROUPS = {
  charge: [
    'charge-amperage', 'charge-amperagemax', 'charge-amperagerequested',
    'charge-chargelimits', 'charge-chargeportstatuscolor', 'charge-chargerate',
    'charge-chargerecords', 'charge-chargerphases', 'charge-chargetimers',
    'charge-chargingconnectortype', 'charge-detailedchargingstatus',
    'charge-energyadded', 'charge-fastchargertype', 'charge-ischarging',
    'charge-ischargingcableconnected', 'charge-ischargingcablelatched',
    'charge-ischargingportflapopen', 'charge-isfastchargerpresent',
    'charge-timetocomplete', 'charge-voltage', 'charge-wattage',
  ],
  climate: ['climate-externaltemperature', 'climate-internaltemperature'],
  closure: [
    'closure-doors', 'closure-enginecover', 'closure-fronttrunk',
    'closure-islocked', 'closure-reartrunk', 'closure-sunroof',
    'closure-tailgate', 'closure-windows',
  ],
  connectivitySoftware: ['connectivitysoftware-currentfirmwareversion'],
  connectivityStatus: [
    'connectivitystatus-isasleep', 'connectivitystatus-isdigitalkeypaired',
    'connectivitystatus-isonline',
  ],
  diagnostics: [
    'diagnostics-abs', 'diagnostics-activesafety', 'diagnostics-airbag',
    'diagnostics-brakefluid', 'diagnostics-driverassistance', 'diagnostics-dtccount',
    'diagnostics-dtclist', 'diagnostics-emissions', 'diagnostics-evbatteryconditioning',
    'diagnostics-evcharging', 'diagnostics-evdriveunit', 'diagnostics-evhvbattery',
    'diagnostics-lighting', 'diagnostics-mil', 'diagnostics-oillife',
    'diagnostics-oilpressure', 'diagnostics-oiltemperature', 'diagnostics-telematics',
    'diagnostics-tirepressure', 'diagnostics-tirepressuremonitoring',
    'diagnostics-transmission', 'diagnostics-washerfluid', 'diagnostics-waterinfuel',
  ],
  hvac: [
    'hvac-cabintargettemperature', 'hvac-iscabinhvacactive',
    'hvac-isfrontdefrosteractive', 'hvac-isreardefrosteractive',
    'hvac-issteeringheateractive',
  ],
  internalCombustionEngine: [
    'internalcombustionengine-amountremaining', 'internalcombustionengine-fuellevel',
    'internalcombustionengine-oillife', 'internalcombustionengine-range',
  ],
  location: ['location-isathome', 'location-preciselocation'],
  lowVoltageBattery: ['lowvoltagebattery-stateofcharge', 'lowvoltagebattery-status'],
  motion: ['motion-currentspeed'],
  odometer: ['odometer-traveleddistance'],
  service: ['service-isinservice', 'service-records'],
  surveillance: ['surveillance-brand', 'surveillance-isenabled'],
  tractionBattery: [
    'tractionbattery-isheateractive', 'tractionbattery-maxrangechargecounter',
    'tractionbattery-nominalcapacity', 'tractionbattery-range',
    'tractionbattery-stateofcharge',
  ],
  transmission: ['transmission-drivemode', 'transmission-gearstate'],
  vehicleIdentification: [
    'vehicleidentification-exteriorcolor', 'vehicleidentification-nickname',
    'vehicleidentification-packages', 'vehicleidentification-trim',
    'vehicleidentification-vin',
  ],
  vehicleUserAccount: ['vehicleuseraccount-permissions', 'vehicleuseraccount-role'],
  wheel: ['wheel-style', 'wheel-tires'],
} as const;

export const ALL_SIGNAL_CODES = Object.values(SIGNAL_GROUPS).flat();
