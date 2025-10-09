export type Direction = "up" | "down" | "idle";
export type Door = "opening" | "open" | "closing" | "closed";

export interface SystemConfigVm {
  floors: number;
  elevators: number;
  ticksPerFloor: number;
  doorOpenTicks: number;
  tickMs: number;
}

export interface ElevatorVm {
  id: number;
  currentFloor: number;
  direction: Direction;
  door: Door;
  doorTicks: number;
  moveTicks: number;
  targets: number[];
  queueUp: number[];
  queueDown: number[];
}

export interface HallCallVm {
  floor: number;
  direction: "up" | "down";
  ts: number;
}

export interface SystemStateVm {
  config: SystemConfigVm;
  elevators: ElevatorVm[];
  pendingHallCalls: HallCallVm[];
  ts: number;
}

export interface OkVm {
  ok: boolean;
}
