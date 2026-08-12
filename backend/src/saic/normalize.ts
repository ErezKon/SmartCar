import type { VehicleStatusResp, ChrgMgmtDataResp } from './types';
import { BMS_CHARGING_STATUS, TARGET_SOC_MAP, CHARGE_CURRENT_LIMIT_MAP, CHARGING_TYPE_MAP, CHARGING_STOP_REASON_MAP } from './types';

/**
 * Normalized signal compatible with the app's signal-code vocabulary.
 * Uses the same codes as Smartcar where a genuine equivalent exists;
 * SAIC-only fields keep a `saic-` prefix.
 */
export interface NormalizedSignal {
  code: string;
  value: unknown;
  unit?: string;
  dataAge?: string;
  source: 'saic';
}

/**
 * Normalize a VehicleStatusResp into the app's signal vocabulary.
 *
 * Mappings where a genuine Smartcar equivalent exists:
 * - SOC -> tractionbattery-stateofcharge
 * - Range -> tractionbattery-range
 * - Odometer -> odometer-traveleddistance
 * - GPS -> location-preciselocation
 * - Temps -> climate-externaltemperature / climate-internaltemperature
 * - Doors/locks -> closure-doors, closure-islocked
 * - Windows -> closure-windows
 * - Tyre pressures -> diagnostics-tirepressure
 * - Charging flags -> charge-ischarging, charge-ischargingcableconnected
 *
 * SAIC-only fields keep `saic-` prefixed codes.
 */
export function normalizeVehicleStatus(
  data: VehicleStatusResp,
  recordedAt?: string
): NormalizedSignal[] {
  const signals: NormalizedSignal[] = [];
  const ts = recordedAt || new Date().toISOString();
  const status = data.basicVehicleStatus;

  if (!status) return signals;

  // Odometer (raw * 0.1 = km)
  if (status.mileage !== undefined) {
    signals.push({
      code: 'odometer-traveleddistance',
      value: +(status.mileage * 0.1).toFixed(1),
      unit: 'km',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Electric range (raw * 0.1 = km)
  if (status.fuelRangeElec !== undefined) {
    signals.push({
      code: 'tractionbattery-range',
      value: +(status.fuelRangeElec * 0.1).toFixed(1),
      unit: 'km',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Temperatures
  if (status.exteriorTemperature !== undefined) {
    signals.push({
      code: 'climate-externaltemperature',
      value: status.exteriorTemperature,
      unit: 'C',
      dataAge: ts,
      source: 'saic',
    });
  }

  if (status.interiorTemperature !== undefined) {
    signals.push({
      code: 'climate-internaltemperature',
      value: status.interiorTemperature,
      unit: 'C',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Lock status
  if (status.lockStatus !== undefined) {
    signals.push({
      code: 'closure-islocked',
      value: status.lockStatus === 1,
      dataAge: ts,
      source: 'saic',
    });
  }

  // Doors
  signals.push({
    code: 'closure-doors',
    value: {
      driverDoor: status.driverDoor === 1 ? 'OPEN' : 'CLOSED',
      passengerDoor: status.passengerDoor === 1 ? 'OPEN' : 'CLOSED',
      rearLeftDoor: status.rearLeftDoor === 1 ? 'OPEN' : 'CLOSED',
      rearRightDoor: status.rearRightDoor === 1 ? 'OPEN' : 'CLOSED',
    },
    dataAge: ts,
    source: 'saic',
  });

  // Windows
  signals.push({
    code: 'closure-windows',
    value: {
      driverWindow: status.driverWindow === 1 ? 'OPEN' : 'CLOSED',
      passengerWindow: status.passengerWindow === 1 ? 'OPEN' : 'CLOSED',
      rearLeftWindow: status.rearLeftWindow === 1 ? 'OPEN' : 'CLOSED',
      rearRightWindow: status.rearRightWindow === 1 ? 'OPEN' : 'CLOSED',
    },
    dataAge: ts,
    source: 'saic',
  });

  // Bonnet / trunk
  if (status.bonnetStatus !== undefined) {
    signals.push({
      code: 'closure-enginecover',
      value: status.bonnetStatus === 1 ? 'OPEN' : 'CLOSED',
      dataAge: ts,
      source: 'saic',
    });
  }

  if (status.bootStatus !== undefined) {
    signals.push({
      code: 'closure-reartrunk',
      value: status.bootStatus === 1 ? 'OPEN' : 'CLOSED',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Sunroof
  if (status.sunroofStatus !== undefined) {
    signals.push({
      code: 'closure-sunroof',
      value: status.sunroofStatus === 1 ? 'OPEN' : 'CLOSED',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Tyre pressures (raw * 0.04 = bar)
  if (
    status.frontLeftTyrePressure !== undefined ||
    status.frontRightTyrePressure !== undefined ||
    status.rearLeftTyrePressure !== undefined ||
    status.rearRightTyrePressure !== undefined
  ) {
    signals.push({
      code: 'diagnostics-tirepressure',
      value: {
        frontLeft: status.frontLeftTyrePressure !== undefined ? +(status.frontLeftTyrePressure * 0.04).toFixed(2) : null,
        frontRight: status.frontRightTyrePressure !== undefined ? +(status.frontRightTyrePressure * 0.04).toFixed(2) : null,
        rearLeft: status.rearLeftTyrePressure !== undefined ? +(status.rearLeftTyrePressure * 0.04).toFixed(2) : null,
        rearRight: status.rearRightTyrePressure !== undefined ? +(status.rearRightTyrePressure * 0.04).toFixed(2) : null,
      },
      unit: 'bar',
      dataAge: ts,
      source: 'saic',
    });
  }

  // 12V battery voltage
  if (status.batteryVoltage !== undefined) {
    signals.push({
      code: 'lowvoltagebattery-status',
      value: status.batteryVoltage,
      unit: 'V',
      dataAge: ts,
      source: 'saic',
    });
  }

  // HVAC / remote climate
  if (status.remoteClimateStatus !== undefined) {
    signals.push({
      code: 'hvac-iscabinhvacactive',
      value: status.remoteClimateStatus === 1,
      dataAge: ts,
      source: 'saic',
    });
  }

  // GPS location
  const gps = data.gpsPosition;
  if (gps?.wayPoint?.position) {
    const lat = gps.wayPoint.position.latitude / 1000000;
    const lon = gps.wayPoint.position.longitude / 1000000;
    signals.push({
      code: 'location-preciselocation',
      value: { latitude: lat, longitude: lon },
      dataAge: ts,
      source: 'saic',
    });
  }

  // Speed
  if (gps?.wayPoint?.speed !== undefined) {
    signals.push({
      code: 'motion-currentspeed',
      value: gps.wayPoint.speed,
      unit: 'km/h',
      dataAge: ts,
      source: 'saic',
    });
  }

  // SAIC-only: power mode, alarm, heated seats, hand brake
  if (status.powerMode !== undefined) {
    signals.push({ code: 'saic-power-mode', value: status.powerMode, dataAge: ts, source: 'saic' });
  }
  if (status.vehicleAlarmStatus !== undefined) {
    signals.push({ code: 'saic-alarm-status', value: status.vehicleAlarmStatus, dataAge: ts, source: 'saic' });
  }
  if (status.frontLeftSeatHeatLevel !== undefined) {
    signals.push({ code: 'saic-seat-heat-left', value: status.frontLeftSeatHeatLevel, dataAge: ts, source: 'saic' });
  }
  if (status.frontRightSeatHeatLevel !== undefined) {
    signals.push({ code: 'saic-seat-heat-right', value: status.frontRightSeatHeatLevel, dataAge: ts, source: 'saic' });
  }

  // Phase 1: hand brake
  if (status.handBrake !== undefined) {
    signals.push({ code: 'saic-hand-brake', value: status.handBrake === 1, dataAge: ts, source: 'saic' });
  }

  // Phase 1: engine / motor running
  if (status.engineStatus !== undefined) {
    signals.push({ code: 'saic-engine-running', value: status.engineStatus === 1, dataAge: ts, source: 'saic' });
  }

  // Phase 1: light status
  if (
    status.mainBeamStatus !== undefined ||
    status.dippedBeamStatus !== undefined ||
    status.sideLightStatus !== undefined
  ) {
    signals.push({
      code: 'saic-lights',
      value: {
        mainBeam: status.mainBeamStatus === 1,
        dippedBeam: status.dippedBeamStatus === 1,
        sideLight: status.sideLightStatus === 1,
      },
      dataAge: ts,
      source: 'saic',
    });
  }

  // Phase 1: current journey distance (raw * 0.1 = km)
  if (status.currentJourneyDistance !== undefined) {
    signals.push({
      code: 'saic-current-journey-distance',
      value: +(status.currentJourneyDistance * 0.1).toFixed(1),
      unit: 'km',
      dataAge: ts,
      source: 'saic',
    });
  }

  return signals;
}

/**
 * Normalize charging management data into the app's signal vocabulary.
 */
export function normalizeChargingData(
  data: ChrgMgmtDataResp,
  recordedAt?: string
): NormalizedSignal[] {
  const signals: NormalizedSignal[] = [];
  const ts = recordedAt || new Date().toISOString();
  const mgmt = data.chrgMgmtData;

  if (!mgmt) return signals;

  // SOC (raw * 0.1 = percentage)
  if (mgmt.bmsPackSOCDsp !== undefined) {
    signals.push({
      code: 'tractionbattery-stateofcharge',
      value: +(mgmt.bmsPackSOCDsp * 0.1).toFixed(1),
      unit: '%',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Charging status
  if (mgmt.bmsChrgSts !== undefined) {
    const isCharging = [1, 3, 10, 11, 12].includes(mgmt.bmsChrgSts);
    signals.push({
      code: 'charge-ischarging',
      value: isCharging,
      dataAge: ts,
      source: 'saic',
    });

    signals.push({
      code: 'charge-detailedchargingstatus',
      value: BMS_CHARGING_STATUS[mgmt.bmsChrgSts] || `Unknown (${mgmt.bmsChrgSts})`,
      dataAge: ts,
      source: 'saic',
    });
  }

  // Cable connected
  if (mgmt.ccuOnbdChrgrPlugOn !== undefined || mgmt.ccuOffBdChrgrPlugOn !== undefined) {
    const connected = (mgmt.ccuOnbdChrgrPlugOn === 1) || (mgmt.ccuOffBdChrgrPlugOn === 1);
    signals.push({
      code: 'charge-ischargingcableconnected',
      value: connected,
      dataAge: ts,
      source: 'saic',
    });
  }

  // Current (raw * 0.05 - 1000.0 = amps)
  if (mgmt.bmsPackCrnt !== undefined) {
    const amps = +(mgmt.bmsPackCrnt * 0.05 - 1000.0).toFixed(2);
    signals.push({
      code: 'charge-amperage',
      value: amps,
      unit: 'A',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Voltage (raw * 0.25 = volts)
  if (mgmt.bmsPackVol !== undefined) {
    const volts = +(mgmt.bmsPackVol * 0.25).toFixed(2);
    signals.push({
      code: 'charge-voltage',
      value: volts,
      unit: 'V',
      dataAge: ts,
      source: 'saic',
    });
  }

  // rvsChargeStatus sub-object holds additional telemetry fields
  const rvs = data.rvsChargeStatus;

  // Power: prefer realtimePower (from rvsChargeStatus) when available, otherwise derive from current * voltage
  if (rvs?.realtimePower !== undefined) {
    signals.push({
      code: 'charge-wattage',
      value: +(rvs.realtimePower * 0.1).toFixed(2),
      unit: 'kW',
      dataAge: ts,
      source: 'saic',
    });
  } else if (mgmt.bmsPackCrnt !== undefined && mgmt.bmsPackVol !== undefined) {
    const amps = mgmt.bmsPackCrnt * 0.05 - 1000.0;
    const volts = mgmt.bmsPackVol * 0.25;
    const powerKw = +((amps * volts) / 1000.0).toFixed(2);
    signals.push({
      code: 'charge-wattage',
      value: powerKw,
      unit: 'kW',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Time to complete
  if (mgmt.chrgngRmnngTime !== undefined && mgmt.chrgngRmnngTimeV === 1) {
    signals.push({
      code: 'charge-timetocomplete',
      value: mgmt.chrgngRmnngTime,
      unit: 'min',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Estimated range
  if (mgmt.bmsEstdElecRng !== undefined) {
    signals.push({
      code: 'tractionbattery-range',
      value: mgmt.bmsEstdElecRng,
      unit: 'km',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Target SOC
  if (mgmt.bmsOnBdChrgTrgtSOCDspCmd !== undefined) {
    const targetPct = TARGET_SOC_MAP[mgmt.bmsOnBdChrgTrgtSOCDspCmd];
    signals.push({
      code: 'charge-chargelimits',
      value: targetPct || mgmt.bmsOnBdChrgTrgtSOCDspCmd,
      unit: '%',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Current limit
  if (mgmt.bmsAltngChrgCrntDspCmd !== undefined) {
    signals.push({
      code: 'charge-amperagerequested',
      value: CHARGE_CURRENT_LIMIT_MAP[mgmt.bmsAltngChrgCrntDspCmd] || String(mgmt.bmsAltngChrgCrntDspCmd),
      dataAge: ts,
      source: 'saic',
    });
  }

  // Charge port lock
  if (mgmt.ccuEleccLckCtrlDspCmd !== undefined) {
    signals.push({
      code: 'charge-ischargingcablelatched',
      value: mgmt.ccuEleccLckCtrlDspCmd === 1,
      dataAge: ts,
      source: 'saic',
    });
  }

  // Battery heating
  if (mgmt.bmsPTCHeatReqDspCmd !== undefined) {
    signals.push({
      code: 'tractionbattery-isheateractive',
      value: mgmt.bmsPTCHeatReqDspCmd === 1,
      dataAge: ts,
      source: 'saic',
    });
  }

  // Charging door
  if (mgmt.chrgngDoorPosSts !== undefined) {
    signals.push({
      code: 'charge-ischargingportflapopen',
      value: mgmt.chrgngDoorPosSts === 1,
      dataAge: ts,
      source: 'saic',
    });
  }

  // Phase 1: mileage of the day (raw * 0.1 = km) — from rvsChargeStatus
  if (rvs?.mileageOfDay !== undefined) {
    signals.push({
      code: 'saic-mileage-today',
      value: +(rvs.mileageOfDay * 0.1).toFixed(1),
      unit: 'km',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Phase 1: mileage since last charge (raw * 0.1 = km) — from rvsChargeStatus
  if (rvs?.mileageSinceLastCharge !== undefined) {
    signals.push({
      code: 'saic-mileage-since-charge',
      value: +(rvs.mileageSinceLastCharge * 0.1).toFixed(1),
      unit: 'km',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Phase 1: power usage since last charge (raw * 0.1 = kWh) — from rvsChargeStatus
  if (rvs?.powerUsageSinceLastCharge !== undefined) {
    signals.push({
      code: 'saic-energy-since-charge',
      value: +(rvs.powerUsageSinceLastCharge * 0.1).toFixed(1),
      unit: 'kWh',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Phase 1: power usage of the day (raw * 0.1 = kWh) — from rvsChargeStatus
  if (rvs?.powerUsageOfDay !== undefined) {
    signals.push({
      code: 'saic-energy-today',
      value: +(rvs.powerUsageOfDay * 0.1).toFixed(1),
      unit: 'kWh',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Phase 1: charging type — from rvsChargeStatus
  if (rvs?.chargingType !== undefined) {
    signals.push({
      code: 'saic-charging-type',
      value: CHARGING_TYPE_MAP[rvs.chargingType] || `Unknown (${rvs.chargingType})`,
      dataAge: ts,
      source: 'saic',
    });
  }

  // Phase 1: charging session duration (minutes) — from rvsChargeStatus
  if (rvs?.chargingDuration !== undefined) {
    signals.push({
      code: 'saic-charging-duration',
      value: rvs.chargingDuration,
      unit: 'min',
      dataAge: ts,
      source: 'saic',
    });
  }

  // Phase 1: charging stop reason — correctly in chrgMgmtData
  if (mgmt.bmsChrgSpRsn !== undefined) {
    signals.push({
      code: 'saic-charging-stop-reason',
      value: CHARGING_STOP_REASON_MAP[mgmt.bmsChrgSpRsn] || `Unknown (${mgmt.bmsChrgSpRsn})`,
      dataAge: ts,
      source: 'saic',
    });
  }

  // Phase 1: charging gun state — from rvsChargeStatus
  if (rvs?.chargingGunState !== undefined) {
    signals.push({
      code: 'saic-charging-gun-state',
      value: rvs.chargingGunState,
      dataAge: ts,
      source: 'saic',
    });
  }

  return signals;
}
