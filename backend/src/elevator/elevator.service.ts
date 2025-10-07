import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Elevator, HallCall, SystemConfig, SystemState } from '../core/types';

@Injectable()
export class ElevatorService implements OnModuleInit, OnModuleDestroy {
  private state: SystemState;
  private timer?: ReturnType<typeof setInterval>;
  private paused = false;

  constructor() {
    this.state = this.makeInitialState();
  }

  onModuleInit() {
    if (process.env.NODE_ENV !== 'test') this.startTicker();
  }

  onModuleDestroy() {
    this.stopTicker();
  }

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
      id,
      currentFloor: 0,
      direction: 'idle',
      door: 'closed',
      doorTicks: 0,
      moveTicks: 0,
      targets: new Set<number>(),
      queueUp: [],
      queueDown: [],
    };
  }

  // ---------- Public API ----------
  getState() {
    return {
      ...this.state,
      elevators: this.state.elevators.map((e) => ({
        ...e,
        targets: Array.from(e.targets),
      })),
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
    const call: HallCall = { floor, direction, ts: Date.now() };
    const exists = this.state.elevators.some((e) => e.targets.has(floor));
    if (!exists) this.assignHallCall(call);
  }

  selectFloor(elevatorId: number, floor: number) {
    if (!this.isValidFloor(floor)) return;
    const e = this.state.elevators.find((x) => x.id === elevatorId);
    if (!e) return;
    this.enqueueTarget(e, floor);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  step(n = 1) {
    for (let i = 0; i < n; i++) this.tick();
  }

  // ---------- Helpers ----------
  private isValidFloor(f: number) {
    return Number.isInteger(f) && f >= 0 && f < this.state.config.floors;
  }

  private startTicker() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.paused) this.tick();
    }, this.state.config.tickMs);
  }

  private stopTicker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  // ---------- Scheduler ----------
  private assignHallCall(call: HallCall) {
    const e = this.pickElevatorForHallCall(call);
    if (!e) {
      this.state.pendingHallCalls.push(call);
      return;
    }
    this.enqueueTarget(e, call.floor, call.direction);
  }

  private pickElevatorForHallCall(call: HallCall): Elevator | undefined {
    const { elevators } = this.state;
    const candidates = elevators.filter((e) => {
      if (e.direction === 'idle') return true;
      if (call.direction === 'up' && e.direction === 'up' && e.currentFloor <= call.floor)
        return true;
      if (call.direction === 'down' && e.direction === 'down' && e.currentFloor >= call.floor)
        return true;
      return false;
    });
    const pool = candidates.length ? candidates : elevators;
    const scored = pool.map((e) => {
      const dist = Math.abs(e.currentFloor - call.floor);
      const load = e.queueUp.length + e.queueDown.length;
      return { e, score: dist * 10 + load };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored[0]?.e;
  }

  private enqueueTarget(e: Elevator, floor: number, preferredDir?: 'up' | 'down') {
    if (e.targets.has(floor)) return;
    e.targets.add(floor);

    const asc = (arr: number[], v: number) =>
      arr.includes(v) ? arr : [...arr, v].sort((a, b) => a - b);
    const desc = (arr: number[], v: number) =>
      arr.includes(v) ? arr : [...arr, v].sort((a, b) => b - a);

    if (preferredDir) {
      if (preferredDir === 'up') e.queueUp = asc(e.queueUp, floor);
      else e.queueDown = desc(e.queueDown, floor);
      if (e.direction === 'idle') e.direction = preferredDir;
      return;
    }

    if (floor > e.currentFloor) {
      e.queueUp = asc(e.queueUp, floor);
      if (e.direction === 'idle') e.direction = 'up';
    } else if (floor < e.currentFloor) {
      e.queueDown = desc(e.queueDown, floor);
      if (e.direction === 'idle') e.direction = 'down';
    } else {
      // ten sam floor — tick otworzy drzwi
    }
  }

  // ---------- Simulation tick ----------
  private tick() {
    this.state.ts = Date.now();

    if (this.state.pendingHallCalls.length) {
      const rest: HallCall[] = [];
      for (const hc of this.state.pendingHallCalls) {
        const e = this.pickElevatorForHallCall(hc);
        if (e) this.enqueueTarget(e, hc.floor, hc.direction);
        else rest.push(hc);
      }
      this.state.pendingHallCalls = rest;
    }

    for (const e of this.state.elevators) {
      if (e.door === 'opening') {
        e.door = 'open';
        e.doorTicks = this.state.config.doorOpenTicks;
        continue;
      }
      if (e.door === 'open') {
        if (--e.doorTicks <= 0) e.door = 'closing';
        continue;
      }
      if (e.door === 'closing') {
        e.door = 'closed';
      }

      if (e.door === 'closed' && e.targets.has(e.currentFloor)) {
        e.targets.delete(e.currentFloor);
        e.queueUp = e.queueUp.filter((f) => f !== e.currentFloor);
        e.queueDown = e.queueDown.filter((f) => f !== e.currentFloor);
        e.door = 'opening';
        e.moveTicks = 0;
        continue;
      }

      if (e.direction === 'up' && e.queueUp.length === 0 && e.queueDown.length > 0)
        e.direction = 'down';
      if (e.direction === 'down' && e.queueDown.length === 0 && e.queueUp.length > 0)
        e.direction = 'up';
      if (e.targets.size === 0) {
        e.direction = 'idle';
        e.moveTicks = 0;
        continue;
      }

      if (e.direction === 'up') {
        if (++e.moveTicks >= this.state.config.ticksPerFloor) {
          e.moveTicks = 0;
          if (e.currentFloor < this.state.config.floors - 1) e.currentFloor += 1;
        }
      } else if (e.direction === 'down') {
        if (++e.moveTicks >= this.state.config.ticksPerFloor) {
          e.moveTicks = 0;
          if (e.currentFloor > 0) e.currentFloor -= 1;
        }
      }
    }
  }
}
