// Auth models
export interface TokenInfo {
  hasToken: boolean;
  expiresAt: number | null;
  remainingSeconds: number | null;
  preview?: string;
}

export interface AuthStatus {
  token: TokenInfo;
  users: ConnectedUser[];
  connectedUsers: number;
}

export interface ConnectedUser {
  userId: string;
  externalId: string;
  createdAt: string;
}

// Connection models
export interface Connection {
  id: string;
  type: string;
  attributes: {
    userId: string;
    vehicleId: string;
    createdAt: string;
    vehicle: {
      make: string;
      model: string;
      year: number;
      mode: string;
    };
  };
}

export interface ConnectionsListResponse {
  data: Connection[];
  meta?: { page: { number: number; size: number; totalPages: number; totalItems: number } };
}

export interface ConnectionResponse {
  data: Connection;
}

// Vehicle models
export interface VehicleAttributes {
  make: string;
  model: string;
  year: number;
  powertrainType: string;
}

export interface VehicleResponse {
  data: {
    id: string;
    type: string;
    attributes: VehicleAttributes;
  };
}

// Signal models
export interface SignalValue {
  type: string;
  attributes: {
    code: string;
    value: any;
    dataAge: string | null;
    requestId?: string;
  };
}

export interface SignalsListResponse {
  data: SignalValue[];
}

export interface SignalResponse {
  data: SignalValue;
}

export interface SignalCodeInfo {
  code: string;
  description: string;
  group: string;
}

export interface SignalCatalogResponse {
  signals: Record<string, SignalCodeInfo>;
  groups: Record<string, SignalCodeInfo[]>;
  totalSignals: number;
}

export interface SignalSnapshot {
  id: number;
  vehicle_id: string;
  signal_code: string;
  value: string;
  data_age: string | null;
  recorded_at: string;
}

// Command models
export type CommandStatus = 'SUCCESS' | 'FAILURE' | 'PENDING';

export interface CommandResponse {
  data: {
    id?: string;
    type: string;
    attributes: {
      status: CommandStatus;
      message?: string;
      errors?: Array<{ code: string; detail: string }>;
    };
  };
}

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

// Webhook models
export interface Webhook {
  id: string;
  type: string;
  attributes: {
    callbackUrl: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface Subscription {
  id: string;
  type: string;
  attributes: {
    webhookId: string;
    userId: string;
    vehicleId: string;
    createdAt: string;
  };
}

export interface WebhookEvent {
  id: number;
  event_id: string | null;
  event_type: string;
  vehicle_id: string | null;
  payload: string;
  received_at: string;
}

// Compatibility models
export interface CompatibleVehicle {
  type: string;
  attributes: {
    make: string;
    model: string;
    year: number;
    powertrainType: string;
    capabilities: string[];
  };
}

export interface CompatibleVehiclesResponse {
  data: CompatibleVehicle[];
  meta?: { totalItems: number };
}

// Management models
export interface Application {
  id: string;
  type: string;
  attributes: {
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ApplicationSecret {
  id: string;
  type: string;
  attributes: {
    secret: string;
    createdAt: string;
  };
}

// Schedule models
export interface DailySchedule {
  startTime: string;
  endTime: string;
  targetSoc?: number;
}

export interface WeeklySchedule {
  schedules: Array<{
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    startTime: string;
    endTime: string;
    targetSoc?: number;
  }>;
}

export interface WorkweekSchedule {
  weekdayStartTime: string;
  weekdayEndTime: string;
  weekendStartTime: string;
  weekendEndTime: string;
  targetSoc?: number;
}
