export type Direction = 'up' | 'down' | 'idle';
export type DoorState = 'opening' | 'open' | 'closing' | 'closed';

export interface HallCall {
  floor: number;
  direction: Exclude<Direction, 'idle'>;
  ts: number;
}

export interface Elevator {
  id: number;
  currentFloor: number;
  direction: Direction;
  door: DoorState;
  doorTicks: number;
  moveTicks: number;
  targets: Set<number>;
  queueUp: number[];
  queueDown: number[];
}

export interface SystemConfig {
  floors: number;
  elevators: number;
  ticksPerFloor: number;
  doorOpenTicks: number;
  tickMs: number;
}

export interface SystemState {
  config: SystemConfig;
  elevators: Elevator[];
  pendingHallCalls: HallCall[];
  ts: number;
}
