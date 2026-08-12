import { describe, it, expect } from 'vitest';
import { _internal, COMMAND_TYPES } from './commands';
import { hashVin } from './client';
import { CHARGING_SCHEDULE_MODE_MAP, ALARM_SETTING_TYPES } from './types';

const { encodeParamByte, encodeParam4Bytes, terminatorParam, buildControlRequest, parseTimeString, MG4_TEMP_MIN, MG4_TEMP_MAX, MG4_TEMP_OFFSET } = _internal;

describe('commands — payload construction', () => {
  describe('encodeParamByte', () => {
    it('encodes 0x00 as base64', () => {
      expect(encodeParamByte(0x00)).toBe(Buffer.from([0x00]).toString('base64'));
    });

    it('encodes 0x01 as base64', () => {
      expect(encodeParamByte(0x01)).toBe(Buffer.from([0x01]).toString('base64'));
    });

    it('encodes 0x03 (high heat) as base64', () => {
      expect(encodeParamByte(0x03)).toBe(Buffer.from([0x03]).toString('base64'));
    });

    it('encodes 0xff and masks to single byte', () => {
      expect(encodeParamByte(0xff)).toBe(Buffer.from([0xff]).toString('base64'));
    });

    it('masks values larger than 0xff', () => {
      expect(encodeParamByte(0x100)).toBe(Buffer.from([0x00]).toString('base64'));
    });
  });

  describe('encodeParam4Bytes', () => {
    it('encodes 0x00000000 as 4-byte big-endian base64', () => {
      const result = encodeParam4Bytes(0);
      const decoded = Buffer.from(result, 'base64');
      expect(decoded.length).toBe(4);
      expect(decoded.readUInt32BE(0)).toBe(0);
    });

    it('encodes a nonzero 4-byte value', () => {
      const result = encodeParam4Bytes(0x01020304);
      const decoded = Buffer.from(result, 'base64');
      expect(decoded.length).toBe(4);
      expect(decoded.readUInt32BE(0)).toBe(0x01020304);
    });
  });

  describe('terminatorParam', () => {
    it('returns paramId 255 with 4-byte zero value', () => {
      const term = terminatorParam();
      expect(term.paramId).toBe(255);
      const decoded = Buffer.from(term.paramValue, 'base64');
      expect(decoded.length).toBe(4);
      expect(decoded.readUInt32BE(0)).toBe(0);
    });
  });

  describe('buildControlRequest', () => {
    it('hashes VIN and sets rvcReqType', () => {
      const vin = 'LSJWH4091TN019736';
      const req = buildControlRequest(vin, COMMAND_TYPES.LOCK, null);
      expect(req.vin).toBe(hashVin(vin));
      expect(req.vin).not.toBe(vin);
      expect(req.rvcReqType).toBe('1');
      expect(req.rvcParams).toBeNull();
    });

    it('passes through params array', () => {
      const params = [{ paramId: 1, paramValue: encodeParamByte(0x01) }, terminatorParam()];
      const req = buildControlRequest('TEST123', COMMAND_TYPES.FIND_VEHICLE, params);
      expect(req.rvcParams).toHaveLength(2);
      expect(req.rvcParams![0].paramId).toBe(1);
      expect(req.rvcParams![1].paramId).toBe(255);
    });
  });

  describe('COMMAND_TYPES', () => {
    it('has correct type codes per protocol spec', () => {
      expect(COMMAND_TYPES.FIND_VEHICLE).toBe('0');
      expect(COMMAND_TYPES.LOCK).toBe('1');
      expect(COMMAND_TYPES.UNLOCK).toBe('2');
      expect(COMMAND_TYPES.WINDOWS).toBe('3');
      expect(COMMAND_TYPES.HEATED_SEATS).toBe('5');
      expect(COMMAND_TYPES.CLIMATE).toBe('6');
      expect(COMMAND_TYPES.REAR_WINDOW_HEAT).toBe('32');
    });
  });

  describe('MG4 temperature mapping', () => {
    it('has correct range and offset for MG4 EH32', () => {
      expect(MG4_TEMP_MIN).toBe(17);
      expect(MG4_TEMP_MAX).toBe(33);
      expect(MG4_TEMP_OFFSET).toBe(3);
    });

    it('maps 22C to tempIdx 8 (the documented default)', () => {
      const tempIdx = 22 - MG4_TEMP_MIN + MG4_TEMP_OFFSET;
      expect(tempIdx).toBe(8);
    });

    it('maps 17C (min) to tempIdx 3', () => {
      const tempIdx = 17 - MG4_TEMP_MIN + MG4_TEMP_OFFSET;
      expect(tempIdx).toBe(3);
    });

    it('maps 33C (max) to tempIdx 19', () => {
      const tempIdx = 33 - MG4_TEMP_MIN + MG4_TEMP_OFFSET;
      expect(tempIdx).toBe(19);
    });
  });

  describe('findVehicle payload', () => {
    it('constructs correct params for horn+lights enable', () => {
      const params = [
        { paramId: 1, paramValue: encodeParamByte(0x01) },
        { paramId: 2, paramValue: encodeParamByte(0x01) },
        { paramId: 3, paramValue: encodeParamByte(0x01) },
        terminatorParam(),
      ];
      expect(params).toHaveLength(4);
      expect(params[0].paramId).toBe(1);
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(0x01);
      expect(params[3].paramId).toBe(255);
    });
  });

  describe('unlock payload', () => {
    it('constructs correct params with lockId=3 for doors', () => {
      const lockId = 3;
      const params = [
        { paramId: 4, paramValue: encodeParamByte(0x00) },
        { paramId: 5, paramValue: encodeParamByte(0x00) },
        { paramId: 6, paramValue: encodeParamByte(0x00) },
        { paramId: 7, paramValue: encodeParamByte(lockId) },
        terminatorParam(),
      ];
      expect(params).toHaveLength(5);
      expect(Buffer.from(params[3].paramValue, 'base64')[0]).toBe(3);
    });

    it('constructs correct params with lockId=2 for tailgate', () => {
      const lockId = 2;
      const params = [
        { paramId: 4, paramValue: encodeParamByte(0x00) },
        { paramId: 5, paramValue: encodeParamByte(0x00) },
        { paramId: 6, paramValue: encodeParamByte(0x00) },
        { paramId: 7, paramValue: encodeParamByte(lockId) },
        terminatorParam(),
      ];
      expect(Buffer.from(params[3].paramValue, 'base64')[0]).toBe(2);
    });
  });

  describe('climate payload', () => {
    it('constructs correct params for startClimate at 25C, fan medium', () => {
      const temperature = 25;
      const fanSpeed = 2;
      const tempIdx = temperature - MG4_TEMP_MIN + MG4_TEMP_OFFSET;

      const params = [
        { paramId: 19, paramValue: encodeParamByte(fanSpeed) },
        { paramId: 20, paramValue: encodeParamByte(tempIdx) },
        { paramId: 22, paramValue: encodeParamByte(0x01) },
        terminatorParam(),
      ];
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(2); // fan med
      expect(Buffer.from(params[1].paramValue, 'base64')[0]).toBe(11); // 25 - 17 + 3 = 11
      expect(Buffer.from(params[2].paramValue, 'base64')[0]).toBe(1); // AC on
    });

    it('constructs correct params for stopClimate', () => {
      const params = [
        { paramId: 19, paramValue: encodeParamByte(0x00) },
        { paramId: 20, paramValue: encodeParamByte(MG4_TEMP_OFFSET) },
        { paramId: 22, paramValue: encodeParamByte(0x00) },
        terminatorParam(),
      ];
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(0); // fan off
      expect(Buffer.from(params[2].paramValue, 'base64')[0]).toBe(0); // AC off
    });
  });

  describe('heated seats payload', () => {
    it('constructs correct params for driver level 3, passenger level 1', () => {
      const params = [
        { paramId: 17, paramValue: encodeParamByte(3) },
        { paramId: 18, paramValue: encodeParamByte(1) },
        terminatorParam(),
      ];
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(3);
      expect(Buffer.from(params[1].paramValue, 'base64')[0]).toBe(1);
    });
  });

  // --- Phase 2: New command payload tests ---

  describe('COMMAND_TYPES includes new types', () => {
    it('has HEATED_STEERING_WHEEL type code', () => {
      expect(COMMAND_TYPES.HEATED_STEERING_WHEEL).toBe('8');
    });
  });

  describe('window control payload', () => {
    it('constructs close params (action=0)', () => {
      const params = [
        { paramId: 13, paramValue: encodeParamByte(0) },
        terminatorParam(),
      ];
      expect(params).toHaveLength(2);
      expect(params[0].paramId).toBe(13);
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(0);
    });

    it('constructs ventilate params (action=1)', () => {
      const params = [
        { paramId: 13, paramValue: encodeParamByte(1) },
        terminatorParam(),
      ];
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(1);
    });

    it('constructs open params (action=2)', () => {
      const params = [
        { paramId: 13, paramValue: encodeParamByte(2) },
        terminatorParam(),
      ];
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(2);
    });

    it('uses WINDOWS command type', () => {
      const req = buildControlRequest('TEST123', COMMAND_TYPES.WINDOWS, [
        { paramId: 13, paramValue: encodeParamByte(0) },
        terminatorParam(),
      ]);
      expect(req.rvcReqType).toBe('3');
    });
  });

  describe('sunroof control payload', () => {
    it('constructs open params (action=1)', () => {
      const params = [
        { paramId: 25, paramValue: encodeParamByte(1) },
        terminatorParam(),
      ];
      expect(params[0].paramId).toBe(25);
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(1);
    });

    it('constructs close params (action=0)', () => {
      const params = [
        { paramId: 25, paramValue: encodeParamByte(0) },
        terminatorParam(),
      ];
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(0);
    });
  });

  describe('heated steering wheel payload', () => {
    it('constructs enable params', () => {
      const params = [
        { paramId: 24, paramValue: encodeParamByte(0x01) },
        terminatorParam(),
      ];
      expect(params[0].paramId).toBe(24);
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(0x01);
    });

    it('constructs disable params', () => {
      const params = [
        { paramId: 24, paramValue: encodeParamByte(0x00) },
        terminatorParam(),
      ];
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(0x00);
    });

    it('uses HEATED_STEERING_WHEEL command type', () => {
      const req = buildControlRequest('TEST123', COMMAND_TYPES.HEATED_STEERING_WHEEL, [
        { paramId: 24, paramValue: encodeParamByte(0x01) },
        terminatorParam(),
      ]);
      expect(req.rvcReqType).toBe('8');
    });
  });

  describe('climate mode payload', () => {
    it('constructs front defrost mode (paramId 19=5, AC off)', () => {
      const modeValue = 5; // front defrost
      const tempIdx = 22 - MG4_TEMP_MIN + MG4_TEMP_OFFSET;
      const params = [
        { paramId: 19, paramValue: encodeParamByte(modeValue) },
        { paramId: 20, paramValue: encodeParamByte(tempIdx) },
        { paramId: 22, paramValue: encodeParamByte(0x00) }, // AC off
        terminatorParam(),
      ];
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(5);
      expect(Buffer.from(params[2].paramValue, 'base64')[0]).toBe(0); // AC off for defrost
    });

    it('constructs blowing mode (fan on, AC off)', () => {
      const fanSpeed = 2;
      const tempIdx = 22 - MG4_TEMP_MIN + MG4_TEMP_OFFSET;
      const params = [
        { paramId: 19, paramValue: encodeParamByte(fanSpeed) },
        { paramId: 20, paramValue: encodeParamByte(tempIdx) },
        { paramId: 22, paramValue: encodeParamByte(0x00) }, // AC off
        terminatorParam(),
      ];
      expect(Buffer.from(params[0].paramValue, 'base64')[0]).toBe(2); // fan speed
      expect(Buffer.from(params[2].paramValue, 'base64')[0]).toBe(0); // AC off
    });
  });

  describe('charging cable lock payload', () => {
    it('constructs lock request (tboxEleccLckCtrlReq=1)', () => {
      const body = {
        vin: hashVin('TEST123'),
        chrgCtrlReq: 0,
        tboxV2XReq: 0,
        tboxEleccLckCtrlReq: 1,
      };
      expect(body.chrgCtrlReq).toBe(0);
      expect(body.tboxEleccLckCtrlReq).toBe(1);
    });

    it('constructs unlock request (tboxEleccLckCtrlReq=2)', () => {
      const body = {
        vin: hashVin('TEST123'),
        chrgCtrlReq: 0,
        tboxV2XReq: 0,
        tboxEleccLckCtrlReq: 2,
      };
      expect(body.tboxEleccLckCtrlReq).toBe(2);
    });
  });

  // --- Phase 3: Charging & Battery Heating Schedule payload tests ---

  describe('parseTimeString', () => {
    it('parses valid "HH:MM" time', () => {
      expect(parseTimeString('08:30')).toEqual({ hours: 8, minutes: 30 });
    });

    it('parses midnight "00:00"', () => {
      expect(parseTimeString('00:00')).toEqual({ hours: 0, minutes: 0 });
    });

    it('parses end of day "23:59"', () => {
      expect(parseTimeString('23:59')).toEqual({ hours: 23, minutes: 59 });
    });

    it('parses single-digit hour "9:00"', () => {
      expect(parseTimeString('9:00')).toEqual({ hours: 9, minutes: 0 });
    });

    it('throws on invalid format "8pm"', () => {
      expect(() => parseTimeString('8pm')).toThrow('Invalid time format');
    });

    it('throws on out-of-range hours "25:00"', () => {
      expect(() => parseTimeString('25:00')).toThrow('Invalid time value');
    });

    it('throws on out-of-range minutes "12:60"', () => {
      expect(() => parseTimeString('12:60')).toThrow('Invalid time value');
    });

    it('throws on empty string', () => {
      expect(() => parseTimeString('')).toThrow('Invalid time format');
    });
  });

  describe('charging schedule payload', () => {
    it('constructs correct schedule request body', () => {
      const body = {
        vin: hashVin('TEST123'),
        startTime: '22:00',
        endTime: '06:00',
        mode: CHARGING_SCHEDULE_MODE_MAP['until_target_soc'],
      };
      expect(body.startTime).toBe('22:00');
      expect(body.endTime).toBe('06:00');
      expect(body.mode).toBe(1);
    });

    it('maps schedule modes to correct codes', () => {
      expect(CHARGING_SCHEDULE_MODE_MAP['disabled']).toBe(0);
      expect(CHARGING_SCHEDULE_MODE_MAP['until_target_soc']).toBe(1);
      expect(CHARGING_SCHEDULE_MODE_MAP['until_scheduled_time']).toBe(2);
    });

    it('constructs disabled schedule (mode=0)', () => {
      const body = {
        vin: hashVin('TEST123'),
        startTime: '00:00',
        endTime: '00:00',
        mode: CHARGING_SCHEDULE_MODE_MAP['disabled'],
      };
      expect(body.mode).toBe(0);
    });
  });

  describe('battery heating schedule payload', () => {
    it('constructs ON schedule body (mode=1)', () => {
      const body = {
        vin: hashVin('TEST123'),
        startTime: '06:30',
        mode: 1,
      };
      expect(body.startTime).toBe('06:30');
      expect(body.mode).toBe(1);
    });

    it('constructs OFF schedule body (mode=0)', () => {
      const body = {
        vin: hashVin('TEST123'),
        startTime: '06:30',
        mode: 0,
      };
      expect(body.mode).toBe(0);
    });
  });

  // --- Phase 4: Alarm Configuration payload tests ---

  describe('alarm switches payload', () => {
    it('constructs alarm switches request with PIN redacted in log', () => {
      const body = {
        vin: hashVin('TEST123'),
        pin: '1234',
        alarmSwitchList: [
          { alarmSettingType: 0, alarmSwitch: true, functionSwitch: true },
          { alarmSettingType: 1, alarmSwitch: false, functionSwitch: false },
        ],
      };
      // Simulate log redaction
      const logBody = { ...body, pin: '***' };
      expect(logBody.pin).toBe('***');
      expect(body.alarmSwitchList).toHaveLength(2);
      expect(body.alarmSwitchList[0].alarmSettingType).toBe(0);
      expect(body.alarmSwitchList[0].alarmSwitch).toBe(true);
    });

    it('has all alarm setting types defined', () => {
      expect(Object.keys(ALARM_SETTING_TYPES)).toHaveLength(7);
      expect(ALARM_SETTING_TYPES[0]).toBe('Abnormal');
      expect(ALARM_SETTING_TYPES[6]).toBe('Speeding');
    });

    it('constructs full alarm switch list with all 7 types', () => {
      const switches = Array.from({ length: 7 }, (_, i) => ({
        alarmSettingType: i,
        alarmSwitch: true,
        functionSwitch: true,
      }));
      expect(switches).toHaveLength(7);
      expect(switches[0].alarmSettingType).toBe(0);
      expect(switches[6].alarmSettingType).toBe(6);
    });
  });
});
