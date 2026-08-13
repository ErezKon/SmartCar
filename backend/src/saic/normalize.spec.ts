import { describe, it, expect } from 'vitest';
import { normalizeVehicleStatus, normalizeChargingData } from './normalize';
import type { VehicleStatusResp, ChrgMgmtDataResp } from './types';

describe('SAIC Normalize', () => {
  describe('normalizeVehicleStatus', () => {
    const sampleStatus: VehicleStatusResp = {
      basicVehicleStatus: {
        batteryVoltage: 12.6,
        bonnetStatus: 0,
        bootStatus: 0,
        canBusActive: 1,
        driverDoor: 0,
        passengerDoor: 0,
        rearLeftDoor: 0,
        rearRightDoor: 1,
        driverWindow: 0,
        passengerWindow: 0,
        rearLeftWindow: 0,
        rearRightWindow: 0,
        lockStatus: 1,
        engineStatus: 0,
        handBrake: 1,
        exteriorTemperature: 28,
        interiorTemperature: 32,
        mileage: 12345,           // * 0.1 = 1234.5 km
        fuelRangeElec: 3200,      // * 0.1 = 320.0 km
        remoteClimateStatus: 0,
        frontLeftTyrePressure: 62,  // * 0.04 = 2.48 bar
        frontRightTyrePressure: 63,
        rearLeftTyrePressure: 60,
        rearRightTyrePressure: 61,
        sunroofStatus: 0,
        frontLeftSeatHeatLevel: 0,
        frontRightSeatHeatLevel: 0,
        powerMode: 0,
        vehicleAlarmStatus: 0,
      },
      gpsPosition: {
        gpsStatus: 3,
        timeStamp: 1700000000000,
        wayPoint: {
          heading: 180,
          speed: 0,
          hdop: 1,
          satellites: 12,
          position: {
            latitude: 32070000,  // / 1000000 = 32.07
            longitude: 34780000, // / 1000000 = 34.78
            altitude: 50,
          },
        },
      },
      statusTime: 1700000000000,
    };

    it('should map odometer correctly', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const odometer = signals.find(s => s.code === 'odometer-traveleddistance');
      expect(odometer).toBeDefined();
      expect(odometer!.value).toBe(1234.5);
      expect(odometer!.unit).toBe('km');
    });

    it('should map electric range correctly', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const range = signals.find(s => s.code === 'tractionbattery-range');
      expect(range).toBeDefined();
      expect(range!.value).toBe(320);
    });

    it('should map temperatures correctly', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const ext = signals.find(s => s.code === 'climate-externaltemperature');
      const int = signals.find(s => s.code === 'climate-internaltemperature');
      expect(ext!.value).toBe(28);
      expect(int!.value).toBe(32);
    });

    it('should map lock status correctly', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const locked = signals.find(s => s.code === 'closure-islocked');
      expect(locked!.value).toBe(true);
    });

    it('should map doors correctly', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const doors = signals.find(s => s.code === 'closure-doors');
      const doorVal = doors!.value as Record<string, string>;
      expect(doorVal.driverDoor).toBe('CLOSED');
      expect(doorVal.rearRightDoor).toBe('OPEN');
    });

    it('should map tyre pressures correctly', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const tyres = signals.find(s => s.code === 'diagnostics-tirepressure');
      expect(tyres!.unit).toBe('bar');
      const val = tyres!.value as Record<string, number>;
      expect(val.frontLeft).toBe(2.48);
    });

    it('should map GPS location correctly', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const loc = signals.find(s => s.code === 'location-preciselocation');
      const val = loc!.value as { latitude: number; longitude: number };
      expect(val.latitude).toBe(32.07);
      expect(val.longitude).toBe(34.78);
    });

    it('should include SAIC-only fields with saic- prefix', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const powerMode = signals.find(s => s.code === 'saic-power-mode');
      expect(powerMode).toBeDefined();
    });

    it('should set source to saic for all signals', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      for (const signal of signals) {
        expect(signal.source).toBe('saic');
      }
    });

    it('should map hand brake correctly', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const handBrake = signals.find(s => s.code === 'saic-hand-brake');
      expect(handBrake).toBeDefined();
      expect(handBrake!.value).toBe(true);
    });

    it('should map engine status correctly', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const engine = signals.find(s => s.code === 'saic-engine-running');
      expect(engine).toBeDefined();
      expect(engine!.value).toBe(false);
    });

    it('should map light status when present', () => {
      const statusWithLights: VehicleStatusResp = {
        ...sampleStatus,
        basicVehicleStatus: {
          ...sampleStatus.basicVehicleStatus,
          mainBeamStatus: 0,
          dippedBeamStatus: 1,
          sideLightStatus: 1,
        },
      };
      const signals = normalizeVehicleStatus(statusWithLights);
      const lights = signals.find(s => s.code === 'saic-lights');
      expect(lights).toBeDefined();
      const val = lights!.value as { mainBeam: boolean; dippedBeam: boolean; sideLight: boolean };
      expect(val.mainBeam).toBe(false);
      expect(val.dippedBeam).toBe(true);
      expect(val.sideLight).toBe(true);
    });

    it('should not emit lights signal when no light fields present', () => {
      const signals = normalizeVehicleStatus(sampleStatus);
      const lights = signals.find(s => s.code === 'saic-lights');
      expect(lights).toBeUndefined();
    });

    it('should map current journey distance correctly', () => {
      const statusWithJourney: VehicleStatusResp = {
        ...sampleStatus,
        basicVehicleStatus: {
          ...sampleStatus.basicVehicleStatus,
          currentJourneyDistance: 1500, // * 0.1 = 150.0 km
        },
      };
      const signals = normalizeVehicleStatus(statusWithJourney);
      const journey = signals.find(s => s.code === 'saic-current-journey-distance');
      expect(journey).toBeDefined();
      expect(journey!.value).toBe(150);
      expect(journey!.unit).toBe('km');
    });

    it('should skip negative fuelRangeElec (sentinel value -128)', () => {
      const statusWithBadRange: VehicleStatusResp = {
        ...sampleStatus,
        basicVehicleStatus: {
          ...sampleStatus.basicVehicleStatus,
          fuelRangeElec: -128, // sentinel value -> -12.8 km
        },
      };
      const signals = normalizeVehicleStatus(statusWithBadRange);
      const range = signals.find(s => s.code === 'tractionbattery-range');
      expect(range).toBeUndefined();
    });

    it('should skip negative currentJourneyDistance (sentinel value)', () => {
      const statusWithBadJourney: VehicleStatusResp = {
        ...sampleStatus,
        basicVehicleStatus: {
          ...sampleStatus.basicVehicleStatus,
          currentJourneyDistance: -128,
        },
      };
      const signals = normalizeVehicleStatus(statusWithBadJourney);
      const journey = signals.find(s => s.code === 'saic-current-journey-distance');
      expect(journey).toBeUndefined();
    });
  });

  describe('normalizeChargingData', () => {
    const sampleCharging: ChrgMgmtDataResp = {
      chrgMgmtData: {
        bmsPackSOCDsp: 800,           // * 0.1 = 80.0%
        bmsPackCrnt: 20200,           // * 0.05 - 1000 = 10.0 A
        bmsPackVol: 1520,             // * 0.25 = 380.0 V
        bmsEstdElecRng: 280,
        bmsChrgSts: 1,                // Charging (AC)
        bmsOnBdChrgTrgtSOCDspCmd: 5,  // 80%
        bmsAltngChrgCrntDspCmd: 3,    // 16A
        chrgngRmnngTime: 120,         // 120 minutes
        chrgngRmnngTimeV: 1,
        ccuEleccLckCtrlDspCmd: 1,     // locked
        bmsPTCHeatReqDspCmd: 0,       // no heating
        ccuOnbdChrgrPlugOn: 1,
        ccuOffBdChrgrPlugOn: 0,
        chrgngDoorPosSts: 1,
      },
      rvsChargeStatus: {},
    };

    it('should map SOC correctly', () => {
      const signals = normalizeChargingData(sampleCharging);
      const soc = signals.find(s => s.code === 'tractionbattery-stateofcharge');
      expect(soc!.value).toBe(80);
    });

    it('should map charging status correctly', () => {
      const signals = normalizeChargingData(sampleCharging);
      const isCharging = signals.find(s => s.code === 'charge-ischarging');
      expect(isCharging!.value).toBe(true);

      const detailed = signals.find(s => s.code === 'charge-detailedchargingstatus');
      expect(detailed!.value).toBe('Charging (AC)');
    });

    it('should map cable connected correctly', () => {
      const signals = normalizeChargingData(sampleCharging);
      const cable = signals.find(s => s.code === 'charge-ischargingcableconnected');
      expect(cable!.value).toBe(true);
    });

    it('should compute current correctly', () => {
      const signals = normalizeChargingData(sampleCharging);
      const amps = signals.find(s => s.code === 'charge-amperage');
      expect(amps!.value).toBe(10);
    });

    it('should compute voltage correctly', () => {
      const signals = normalizeChargingData(sampleCharging);
      const volts = signals.find(s => s.code === 'charge-voltage');
      expect(volts!.value).toBe(380);
    });

    it('should compute power correctly', () => {
      const signals = normalizeChargingData(sampleCharging);
      const power = signals.find(s => s.code === 'charge-wattage');
      // 10A * 380V / 1000 = 3.8 kW
      expect(power!.value).toBe(3.8);
    });

    it('should map target SOC correctly', () => {
      const signals = normalizeChargingData(sampleCharging);
      const limit = signals.find(s => s.code === 'charge-chargelimits');
      expect(limit!.value).toBe(80); // code 5 = 80%
    });

    it('should map charge current limit correctly', () => {
      const signals = normalizeChargingData(sampleCharging);
      const currentLimit = signals.find(s => s.code === 'charge-amperagerequested');
      expect(currentLimit!.value).toBe('16A');
    });

    it('should map time to complete', () => {
      const signals = normalizeChargingData(sampleCharging);
      const time = signals.find(s => s.code === 'charge-timetocomplete');
      expect(time!.value).toBe(120);
      expect(time!.unit).toBe('min');
    });

    it('should map battery heating', () => {
      const signals = normalizeChargingData(sampleCharging);
      const heating = signals.find(s => s.code === 'tractionbattery-isheateractive');
      expect(heating!.value).toBe(false);
    });

    it('should map charge port status', () => {
      const signals = normalizeChargingData(sampleCharging);
      const latched = signals.find(s => s.code === 'charge-ischargingcablelatched');
      expect(latched!.value).toBe(true);

      const flapOpen = signals.find(s => s.code === 'charge-ischargingportflapopen');
      expect(flapOpen!.value).toBe(true);
    });

    it('should handle non-charging status', () => {
      const notCharging: ChrgMgmtDataResp = {
        ...sampleCharging,
        chrgMgmtData: { ...sampleCharging.chrgMgmtData, bmsChrgSts: 0 },
      };
      const signals = normalizeChargingData(notCharging);
      const isCharging = signals.find(s => s.code === 'charge-ischarging');
      expect(isCharging!.value).toBe(false);
    });

    it('should prefer realtimePower from rvsChargeStatus over derived power', () => {
      const withRealtimePower: ChrgMgmtDataResp = {
        ...sampleCharging,
        rvsChargeStatus: {
          realtimePower: 75, // * 0.1 = 7.5 kW
        },
      };
      const signals = normalizeChargingData(withRealtimePower);
      const power = signals.find(s => s.code === 'charge-wattage');
      expect(power!.value).toBe(7.5);
      expect(power!.unit).toBe('kW');
    });

    it('should map mileage of the day from rvsChargeStatus', () => {
      const withMileage: ChrgMgmtDataResp = {
        ...sampleCharging,
        rvsChargeStatus: {
          mileageOfDay: 456, // * 0.1 = 45.6 km
        },
      };
      const signals = normalizeChargingData(withMileage);
      const mileage = signals.find(s => s.code === 'saic-mileage-today');
      expect(mileage).toBeDefined();
      expect(mileage!.value).toBe(45.6);
      expect(mileage!.unit).toBe('km');
    });

    it('should map mileage since last charge from rvsChargeStatus', () => {
      const withMileage: ChrgMgmtDataResp = {
        ...sampleCharging,
        rvsChargeStatus: {
          mileageSinceLastCharge: 1230, // * 0.1 = 123.0 km
        },
      };
      const signals = normalizeChargingData(withMileage);
      const mileage = signals.find(s => s.code === 'saic-mileage-since-charge');
      expect(mileage).toBeDefined();
      expect(mileage!.value).toBe(123);
      expect(mileage!.unit).toBe('km');
    });

    it('should map energy usage since last charge from rvsChargeStatus', () => {
      const withEnergy: ChrgMgmtDataResp = {
        ...sampleCharging,
        rvsChargeStatus: {
          powerUsageSinceLastCharge: 345, // * 0.1 = 34.5 kWh
        },
      };
      const signals = normalizeChargingData(withEnergy);
      const energy = signals.find(s => s.code === 'saic-energy-since-charge');
      expect(energy).toBeDefined();
      expect(energy!.value).toBe(34.5);
      expect(energy!.unit).toBe('kWh');
    });

    it('should map energy usage of the day from rvsChargeStatus', () => {
      const withEnergy: ChrgMgmtDataResp = {
        ...sampleCharging,
        rvsChargeStatus: {
          powerUsageOfDay: 120, // * 0.1 = 12.0 kWh
        },
      };
      const signals = normalizeChargingData(withEnergy);
      const energy = signals.find(s => s.code === 'saic-energy-today');
      expect(energy).toBeDefined();
      expect(energy!.value).toBe(12);
      expect(energy!.unit).toBe('kWh');
    });

    it('should map charging type from rvsChargeStatus', () => {
      const withType: ChrgMgmtDataResp = {
        ...sampleCharging,
        rvsChargeStatus: {
          chargingType: 1,
        },
      };
      const signals = normalizeChargingData(withType);
      const type = signals.find(s => s.code === 'saic-charging-type');
      expect(type).toBeDefined();
      expect(type!.value).toBe('AC slow');
    });

    it('should map charging duration from rvsChargeStatus', () => {
      const withDuration: ChrgMgmtDataResp = {
        ...sampleCharging,
        rvsChargeStatus: {
          chargingDuration: 90,
        },
      };
      const signals = normalizeChargingData(withDuration);
      const duration = signals.find(s => s.code === 'saic-charging-duration');
      expect(duration).toBeDefined();
      expect(duration!.value).toBe(90);
      expect(duration!.unit).toBe('min');
    });

    it('should map charging stop reason', () => {
      const withReason: ChrgMgmtDataResp = {
        ...sampleCharging,
        chrgMgmtData: {
          ...sampleCharging.chrgMgmtData,
          bmsChrgSpRsn: 1,
        },
      };
      const signals = normalizeChargingData(withReason);
      const reason = signals.find(s => s.code === 'saic-charging-stop-reason');
      expect(reason).toBeDefined();
      expect(reason!.value).toBe('Target SOC reached');
    });

    it('should not emit optional charging signals when absent', () => {
      const signals = normalizeChargingData(sampleCharging);
      expect(signals.find(s => s.code === 'saic-mileage-today')).toBeUndefined();
      expect(signals.find(s => s.code === 'saic-mileage-since-charge')).toBeUndefined();
      expect(signals.find(s => s.code === 'saic-energy-since-charge')).toBeUndefined();
      expect(signals.find(s => s.code === 'saic-energy-today')).toBeUndefined();
      expect(signals.find(s => s.code === 'saic-charging-type')).toBeUndefined();
      expect(signals.find(s => s.code === 'saic-charging-duration')).toBeUndefined();
      expect(signals.find(s => s.code === 'saic-charging-stop-reason')).toBeUndefined();
      expect(signals.find(s => s.code === 'saic-charging-gun-state')).toBeUndefined();
    });

    it('should skip negative bmsEstdElecRng (sentinel value)', () => {
      const withBadRange: ChrgMgmtDataResp = {
        ...sampleCharging,
        chrgMgmtData: { ...sampleCharging.chrgMgmtData, bmsEstdElecRng: -128 },
      };
      const signals = normalizeChargingData(withBadRange);
      const range = signals.find(s => s.code === 'tractionbattery-range');
      expect(range).toBeUndefined();
    });

    it('should skip negative mileageOfDay (sentinel value)', () => {
      const withBadMileage: ChrgMgmtDataResp = {
        ...sampleCharging,
        rvsChargeStatus: { mileageOfDay: -128 },
      };
      const signals = normalizeChargingData(withBadMileage);
      expect(signals.find(s => s.code === 'saic-mileage-today')).toBeUndefined();
    });

    it('should skip negative powerUsageOfDay (sentinel value)', () => {
      const withBadEnergy: ChrgMgmtDataResp = {
        ...sampleCharging,
        rvsChargeStatus: { powerUsageOfDay: -128 },
      };
      const signals = normalizeChargingData(withBadEnergy);
      expect(signals.find(s => s.code === 'saic-energy-today')).toBeUndefined();
    });
  });
});
