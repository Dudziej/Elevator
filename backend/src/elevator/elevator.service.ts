import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DoorState, Elevator, HallCall, SystemConfig, SystemState } from '../core/types';

@Injectable()
export class ElevatorService implements OnModuleInit, OnModuleDestroy {
  private state: SystemState;
private timer?: ReturnType<typeof setInterval>;

  constructor() {
    this.state = this.makeInitialState();
  }

  onModuleInit() {
    this.timer = setInterval(() => { this.state.ts = Date.now(); }, this.state.config.tickMs);
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private makeInitialState(): SystemState {
    const config: SystemConfig = {
      floors: 16,
      elevators: 4,
      ticksPerFloor: 5,
      doorOpenTicks: 6,
      tickMs: 200,
    };
    return {
      config,
      elevators: Array.from({ length: config.elevators }, (_, id) => this.makeElevator(id)),
      pendingHallCalls: [],
      ts: Date.now(),
    };
  }

  private makeElevator(id: number): Elevator {
    return {
      id, currentFloor: 0, direction: 'idle',
      door: 'closed' as DoorState, doorTicks: 0, moveTicks: 0,
      targets: new Set<number>(), queueUp: [], queueDown: [],
    };
  }

  getState() {
    return {
      ...this.state,
      elevators: this.state.elevators.map(e => ({ ...e, targets: Array.from(e.targets) })),
    };
  }

  reset(cfg?: Partial<SystemConfig>) {
    if (cfg) this.state.config = { ...this.state.config, ...cfg };
    const { elevators } = this.state.config;
    this.state.elevators = Array.from({ length: elevators }, (_, id) => this.makeElevator(id));
    this.state.pendingHallCalls = [];
  }

  callElevator(floor: number, direction: 'up' | 'down') {
    if (!this.isValidFloor(floor)) return;
    this.state.pendingHallCalls.push({ floor, direction, ts: Date.now() });
  }

  selectFloor(elevatorId: number, floor: number) {
    if (!this.isValidFloor(floor)) return;
    const e = this.state.elevators.find(x => x.id === elevatorId);
    if (!e) return;
    e.targets.add(floor);
  }

  private isValidFloor(f: number) {
    return Number.isInteger(f) && f >= 0 && f < this.state.config.floors;
  }
}
