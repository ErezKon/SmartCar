// SAIC Account
export interface SaicAccountStatus {
  connected: boolean;
  username?: string;
  region?: string;
  createdAt?: string;
  tokenValid?: boolean;
  tokenExpiresAt?: number | null;
}

export interface SaicConnectResponse {
  status: string;
  username: string;
  region: string;
  userId: string;
  expiresIn: number;
}

// SAIC Vehicles
export interface SaicVehicleModelConfiguration {
  itemCode: string;
  itemName: string;
  itemValue: string;
}

export interface SaicVinInfo {
  vin: string;
  brandName: string;
  modelName: string;
  modelYear: string;
  colorName: string;
  series: string;
  name: string;
  isActivate: boolean;
  isCurrentVehicle: boolean;
  bindTime: number;
  vehicleModelConfiguration: SaicVehicleModelConfiguration[];
}

// SAIC Vehicle Status
export interface SaicBasicVehicleStatus {
  batteryVoltage: number;
  bonnetStatus: number;
  bootStatus: number;
  driverDoor: number;
  passengerDoor: number;
  rearLeftDoor: number;
  rearRightDoor: number;
  driverWindow: number;
  passengerWindow: number;
  rearLeftWindow: number;
  rearRightWindow: number;
  lockStatus: number;
  engineStatus: number;
  exteriorTemperature: number;
  interiorTemperature: number;
  mileage: number;
  fuelRangeElec: number;
  remoteClimateStatus: number;
  frontLeftTyrePressure: number;
  frontRightTyrePressure: number;
  rearLeftTyrePressure: number;
  rearRightTyrePressure: number;
  sunroofStatus: number;
  frontLeftSeatHeatLevel: number;
  frontRightSeatHeatLevel: number;
  powerMode: number;
  vehicleAlarmStatus: number;
  [key: string]: number | string | boolean | undefined;
}

export interface SaicGpsPosition {
  gpsStatus: number;
  timeStamp: number;
  wayPoint: {
    heading: number;
    speed: number;
    hdop: number;
    satellites: number;
    position: {
      latitude: number;
      longitude: number;
      altitude: number;
    };
  };
}

export interface SaicVehicleStatusResp {
  basicVehicleStatus: SaicBasicVehicleStatus;
  gpsPosition: SaicGpsPosition;
  statusTime: number;
}

// SAIC Charging Data
export interface SaicChrgMgmtData {
  bmsPackSOCDsp: number;
  bmsPackCrnt: number;
  bmsPackVol: number;
  bmsEstdElecRng: number;
  bmsChrgSts: number;
  bmsOnBdChrgTrgtSOCDspCmd: number;
  bmsAltngChrgCrntDspCmd: number;
  chrgngRmnngTime: number;
  chrgngRmnngTimeV: number;
  ccuEleccLckCtrlDspCmd: number;
  bmsPTCHeatReqDspCmd: number;
  ccuOnbdChrgrPlugOn: number;
  ccuOffBdChrgrPlugOn: number;
  chrgngDoorPosSts: number;
}

export interface SaicChrgMgmtDataResp {
  chrgMgmtData: SaicChrgMgmtData;
  rvsChargeStatus: Record<string, unknown>;
}

// SAIC Normalized Signal
export interface SaicNormalizedSignal {
  code: string;
  value: unknown;
  unit?: string;
  dataAge?: string;
  source: 'saic';
}

// SAIC Messages
export interface SaicMessage {
  messageId: string | number;
  messageType: string;
  title: string;
  content: string;
  messageTime: string;
  readStatus: number;
  sender: string;
  vin: string;
}

// SAIC Unread Message Count
export interface SaicUnreadMessageCount {
  alarmUnreadCount?: number;
  commandUnreadCount?: number;
  newsUnreadCount?: number;
}

// SAIC Commands
export interface SaicCommandResult {
  status: string;
  data?: unknown;
  durationMs: number;
}

export interface SaicCommandLogEntry {
  id: number;
  vin: string;
  command: string;
  status: string;
  request_body: string | null;
  response_body: string | null;
  event_id: string | null;
  duration_ms: number | null;
  created_at: string;
}

// SAIC Snapshot History
export interface SaicStateSnapshot {
  id: number;
  vin: string;
  field: string;
  value: string | null;
  recorded_at: string;
}

// SAIC Settings
export interface SaicSettings {
  pollingEnabled: boolean;
  pollingIntervalMs: number;
}

// Charging Sessions
export interface SaicChargingSession {
  id: number;
  vin: string;
  status: 'charging' | 'completed';
  start_time: string;
  end_time: string | null;
  start_soc_pct: number;
  end_soc_pct: number | null;
  start_battery_kwh: number;
  end_battery_kwh: number | null;
  energy_added_kwh: number | null;
  start_odometer_km: number;
  end_odometer_km: number | null;
  distance_since_last_charge_km: number | null;
  energy_used_since_last_charge_kwh: number | null;
  efficiency_kwh_per_100km: number | null;
  created_at: string;
}

export interface SaicChargingStats {
  total_sessions: number;
  total_energy_added_kwh: number;
  total_distance_tracked_km: number;
  average_efficiency_kwh_per_100km: number | null;
  best_efficiency_kwh_per_100km: number | null;
  worst_efficiency_kwh_per_100km: number | null;
}

// Provider type
export type ProviderType = 'smartcar' | 'saic';
