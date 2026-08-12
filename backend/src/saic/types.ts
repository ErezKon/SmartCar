// --- Vehicle List ---

export interface VehicleModelConfiguration {
  itemCode: string;
  itemName: string;
  itemValue: string;
}

export interface VinInfo {
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
  vehicleModelConfiguration: VehicleModelConfiguration[];
}

export interface VehicleListResp {
  vinList: VinInfo[];
}

// --- Vehicle Status ---

export interface BasicVehicleStatus {
  batteryVoltage: number;
  bonnetStatus: number;
  bootStatus: number;
  canBusActive: number;
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
  handBrake: number;
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
  // Phase 1: additional telemetry fields
  mainBeamStatus?: number;
  dippedBeamStatus?: number;
  sideLightStatus?: number;
  currentJourneyDistance?: number;
  currentJourneyId?: number;
  [key: string]: number | string | boolean | undefined;
}

export interface GpsPosition {
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

export interface VehicleStatusResp {
  basicVehicleStatus: BasicVehicleStatus;
  gpsPosition: GpsPosition;
  statusTime: number;
}

// --- Charging ---

export interface ChrgMgmtData {
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
  // Phase 1: additional telemetry field (correctly in chrgMgmtData)
  bmsChrgSpRsn?: number;
  [key: string]: number | string | boolean | undefined;
}

export interface RvsChargeStatus {
  // Phase 1: telemetry fields (correct API field names per rvsChargeStatus sub-object)
  mileageOfDay?: number;
  mileageSinceLastCharge?: number;
  realtimePower?: number;
  chargingType?: number;
  chargingDuration?: number;
  powerUsageSinceLastCharge?: number;
  powerUsageOfDay?: number;
  chargingGunState?: number;
  startTime?: number;
  endTime?: number;
  [key: string]: number | string | boolean | undefined;
}

export interface ChrgMgmtDataResp {
  chrgMgmtData: ChrgMgmtData;
  rvsChargeStatus: RvsChargeStatus;
}

// --- Messages ---

export interface MessageEntity {
  messageId: string | number;
  messageType: string;
  title: string;
  content: string;
  messageTime: string;
  readStatus: number;
  sender: string;
  vin: string;
}

export interface MessageListResp {
  messages: MessageEntity[];
  recordsNumber?: number;
}

// --- Charging Control ---

export interface ChargingControlRequest {
  vin: string;
  chrgCtrlReq: number;
  tboxV2XReq: number;
  tboxEleccLckCtrlReq: number;
}

export interface ChargingSettingRequest {
  vin: string;
  onBdChrgTrgtSOCReq: number;
  altngChrgCrntReq: number;
  tboxV2XSpSOCReq: number;
}

// --- Vehicle Control ---

export interface RvcParam {
  paramId: number;
  paramValue: string;
}

export interface VehicleControlReq {
  vin: string;
  rvcReqType: string;
  rvcParams: RvcParam[] | null;
}

// --- Enums ---

export const BMS_CHARGING_STATUS: Record<number, string> = {
  0: 'Unplugged',
  1: 'Charging (AC)',
  2: 'Charge done',
  3: 'Charging',
  4: 'Charge fault',
  5: 'Connecting',
  6: 'Connected, not recognized',
  7: 'Connected, not charging',
  8: 'Charging stopped',
  9: 'Scheduled charging',
  10: 'Charging (DC fast)',
  11: 'Super off-board charging',
  12: 'Charging',
  13: 'V2X discharging',
};

export const TARGET_SOC_MAP: Record<number, number> = {
  1: 40,
  2: 50,
  3: 60,
  4: 70,
  5: 80,
  6: 90,
  7: 100,
};

export const CHARGE_CURRENT_LIMIT_MAP: Record<number, string> = {
  1: '6A',
  2: '8A',
  3: '16A',
  4: 'Max',
};

export const CHARGING_TYPE_MAP: Record<number, string> = {
  0: 'Not charging',
  1: 'AC slow',
  2: 'DC fast',
};

export const CHARGING_STOP_REASON_MAP: Record<number, string> = {
  0: 'Normal',
  1: 'Target SOC reached',
  2: 'Manual stop',
  3: 'Fault',
  4: 'Schedule ended',
  5: 'Timeout',
};

// --- Phase 3: Charging & Battery Heating Schedules ---

export type ChargingScheduleMode = 'disabled' | 'until_target_soc' | 'until_scheduled_time';

export const CHARGING_SCHEDULE_MODE_MAP: Record<ChargingScheduleMode, number> = {
  disabled: 0,
  until_target_soc: 1,
  until_scheduled_time: 2,
};

export interface ChargingScheduleRequest {
  vin: string;
  startTime: string;  // "HH:MM" format
  endTime: string;    // "HH:MM" format
  mode: number;       // 0=disabled, 1=until_target_soc, 2=until_scheduled_time
}

export type BatteryHeatingScheduleMode = 'on' | 'off';

export interface BatteryHeatingScheduleRequest {
  vin: string;
  startTime: string;  // "HH:MM" format
  mode: number;       // 1=on, 0=off
}

// --- Phase 4: Alarm Configuration ---

export interface AlarmSwitch {
  alarmSettingType: number;  // 0-6: abnormal, moving, region, engineStart, startVehicleStatus, offCar, speeding
  alarmSwitch: boolean;
  functionSwitch: boolean;
}

export interface AlarmSwitchesRequest {
  vin: string;
  pin: string;
  alarmSwitchList: AlarmSwitch[];
}

export const ALARM_SETTING_TYPES: Record<number, string> = {
  0: 'Abnormal',
  1: 'Moving',
  2: 'Region',
  3: 'Engine start',
  4: 'Start vehicle status',
  5: 'Off car',
  6: 'Speeding',
};

export interface UnreadMessageCountResp {
  alarmUnreadCount?: number;
  commandUnreadCount?: number;
  newsUnreadCount?: number;
}
