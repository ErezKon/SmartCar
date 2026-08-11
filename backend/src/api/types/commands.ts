// --- Request Types ---

export interface SetChargeLimitRequest {
  data: {
    attributes: {
      percent: number;
    };
  };
}

export interface SetDestinationRequest {
  data: {
    attributes: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface DailyScheduleRequest {
  data: {
    attributes: {
      startTime: string; // HH:mm format
      endTime: string;   // HH:mm format
      targetSoc?: number; // Target state of charge (0-100)
    };
  };
}

export interface WeeklyScheduleRequest {
  data: {
    attributes: {
      schedules: Array<{
        day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
        startTime: string; // HH:mm format
        endTime: string;   // HH:mm format
        targetSoc?: number;
      }>;
    };
  };
}

export interface WorkweekScheduleRequest {
  data: {
    attributes: {
      weekdayStartTime: string; // HH:mm format
      weekdayEndTime: string;   // HH:mm format
      weekendStartTime: string; // HH:mm format
      weekendEndTime: string;   // HH:mm format
      targetSoc?: number;
    };
  };
}

// --- Response Types ---

export type CommandStatus = 'SUCCESS' | 'FAILURE' | 'PENDING';

export interface CommandResponse {
  data: {
    id?: string;
    type: string;
    attributes: {
      status: CommandStatus;
      message?: string;
      errors?: Array<{
        code: string;
        detail: string;
      }>;
    };
  };
}

export interface ScheduleExecutionResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      status: CommandStatus;
      scheduleId?: string;
      message?: string;
      errors?: Array<{
        code: string;
        detail: string;
      }>;
    };
  };
}

// --- Command Log Types ---

export type CommandType =
  | 'charge/start'
  | 'charge/stop'
  | 'charge/set-limit'
  | 'security/lock'
  | 'security/unlock'
  | 'navigation/set-destination'
  | 'charge-schedules/daily'
  | 'charge-schedules/weekly'
  | 'charge-schedules/workweek'
  | 'charge-schedules/delete';

export interface CommandLogEntry {
  id: number;
  vehicle_id: string;
  user_id: string;
  command_type: string;
  status: string;
  request_body: string | null;
  response_body: string | null;
  duration_ms: number | null;
  created_at: string;
}
