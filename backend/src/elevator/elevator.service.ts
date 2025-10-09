import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Elevator, HallCall, SystemConfig, SystemState } from '../core/types';
import { Command } from '../core/commands';
import type { StateStore } from '../core/store';

type ElevatorLike = Omit<Elevator, 'targets'> & { targets: number[] | Set<number> };

@Injectable()
export class ElevatorService implements OnModuleInit, OnModuleDestroy {
  private state: SystemState;
  private timer?: ReturnType<typeof setInterval>;
  private paused = false;

  private queue: Command[] = [];
  private seenKeys = new Map<string, number>();
  private readonly IDEMP_TTL_MS = 2500;

  private snapshotTickCounter = 0;
  private get SNAPSHOT_EVERY_TICKS() {
    return Math.max(1, Math.round(5000 / this.state.config.tickMs));
  }

  constructor(@Inject('STATE_STORE') private readonly store: StateStore) {
    this.state = this.makeInitialState();
  }

  // ---------- Nest lifecycle ----------
  async onModuleInit() {
    if (process.env.NODE_ENV !== 'test') {
      try {
        const snap = await this.store.load();
        if (snap) this.rehydrateFromSnapshot(snap);
      } catch {
        // ignore
      }
      this.startTicker();
    }
  }

  onModuleDestroy() {
    this.stopTicker();
  }

  // ---------- Init ----------
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
    if (cfg && Object.keys(cfg).length > 0) {
      this.state.config = { ...this.state.config, ...cfg };
    }
    const { elevators } = this.state.config;
    this.state.elevators = Array.from({ length: elevators }, (_, id) => this.makeElevator(id));
    this.state.pendingHallCalls = [];
    this.seenKeys.clear();
    this.state.ts = Date.now();
  }

  callElevator(floor: number, direction: 'up' | 'down') {
    if (!this.isValidFloor(floor)) return;
    if (direction === 'up' && floor >= this.state.config.floors - 1) return;
    if (direction === 'down' && floor <= 0) return;
    const key = `call:${floor}:${direction}`;
    if (this.isIdemp(key)) return;
    this.addIdemp(key);
    this.queue.push({ type: 'call', floor, direction, ts: Date.now() });
  }

  selectFloor(elevatorId: number, floor: number) {
    if (!this.isValidFloor(floor)) return;
    const key = `select:${elevatorId}:${floor}`;
    if (this.isIdemp(key)) return;
    this.addIdemp(key);
    this.queue.push({ type: 'select', elevatorId, floor, ts: Date.now() });
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

  private addIdemp(key: string) {
    this.seenKeys.set(key, Date.now() + this.IDEMP_TTL_MS);
  }
  private isIdemp(key: string) {
    const now = Date.now();
    const exp = this.seenKeys.get(key);
    if (exp && exp > now) return true;
    if (exp && exp <= now) this.seenKeys.delete(key);
    return false;
  }
  private gcIdemp() {
    const now = Date.now();
    for (const [k, exp] of this.seenKeys) if (exp <= now) this.seenKeys.delete(k);
  }

  private estimateETA(e: Elevator, targetFloor: number): number {
    const tpf = this.state.config.ticksPerFloor;
    const door = this.state.config.doorOpenTicks;
    let penalty = 0;

    if (e.door === 'open') penalty += Math.max(0, e.doorTicks);
    else if (e.door === 'opening') penalty += 1 + door;
    else if (e.door === 'closing') penalty += 1;

    const dist = (a: number, b: number) => Math.abs(a - b);

    if (e.direction === 'idle' || (e.queueUp.length === 0 && e.queueDown.length === 0)) {
      return penalty + dist(e.currentFloor, targetFloor) * tpf;
    }

    if (e.direction === 'up') {
      if (targetFloor >= e.currentFloor) {
        const betweenStops = e.queueUp.filter((f) => f > e.currentFloor && f < targetFloor).length;
        return penalty + (targetFloor - e.currentFloor) * tpf + betweenStops * door;
      } else {
        const topUp = e.queueUp.at(-1) ?? e.currentFloor;
        const upDistance = Math.max(0, topUp - e.currentFloor);
        const upStops = e.queueUp.filter((f) => f > e.currentFloor).length;
        const downDistance = Math.max(0, topUp - targetFloor);

        return penalty + upDistance * tpf + upStops * door + downDistance * tpf;
      }
    }

    if (targetFloor <= e.currentFloor) {
      const betweenStops = e.queueDown.filter((f) => f < e.currentFloor && f > targetFloor).length;
      return penalty + (e.currentFloor - targetFloor) * tpf + betweenStops * door;
    } else {
      const bottomDown = e.queueDown.at(-1) ?? e.currentFloor;
      const downDistance = Math.max(0, e.currentFloor - bottomDown);
      const downStops = e.queueDown.filter((f) => f < e.currentFloor).length;
      const upDistance = Math.max(0, targetFloor - bottomDown);

      return penalty + downDistance * tpf + downStops * door + upDistance * tpf;
    }
  }

  // ---------- Persistence helpers ----------
  private rehydrateFromSnapshot(snap: SystemState) {
    const sameShape =
      snap.config?.floors === this.state.config.floors &&
      snap.config?.elevators === this.state.config.elevators;

    const base: SystemState = sameShape ? snap : this.makeInitialState();

    const rehydratedElevators: Elevator[] = base.elevators.map((e: ElevatorLike): Elevator => {
      const targetsArray = e.targets instanceof Set ? Array.from(e.targets) : e.targets;
      return {
        ...e,
        targets: new Set<number>(targetsArray),
      };
    });

    this.state = {
      ...base,
      elevators: rehydratedElevators,
      ts: Date.now(),
    };
    this.snapshotTickCounter = 0;
  }

  private maybeSnapshot() {
    if (process.env.NODE_ENV === 'test') return;
    this.snapshotTickCounter++;
    if (this.snapshotTickCounter >= this.SNAPSHOT_EVERY_TICKS) {
      this.snapshotTickCounter = 0;
      void this.store.save(this.state);
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
    const { elevators, config } = this.state;
    const tpf = config.ticksPerFloor;

    const along = elevators
      .filter(
        (e) =>
          (call.direction === 'up' && e.direction === 'up' && e.currentFloor <= call.floor) ||
          (call.direction === 'down' && e.direction === 'down' && e.currentFloor >= call.floor),
      )
      .sort(
        (a, b) => Math.abs(a.currentFloor - call.floor) - Math.abs(b.currentFloor - call.floor),
      );

    if (along.length) {
      let best = along[0];
      let bestScore = Number.POSITIVE_INFINITY;
      for (const e of along) {
        const eta = this.estimateETA(e, call.floor);
        const load = e.queueUp.length + e.queueDown.length;
        const score = eta + load - Math.max(1, tpf);
        if (score < bestScore) {
          bestScore = score;
          best = e;
        }
      }
      return best;
    }

    const idle = elevators.filter((e) => e.direction === 'idle');
    if (idle.length) {
      idle.sort(
        (a, b) => Math.abs(a.currentFloor - call.floor) - Math.abs(b.currentFloor - call.floor),
      );
      return idle[0];
    }

    let best = elevators[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const e of elevators) {
      const eta = this.estimateETA(e, call.floor);
      const load = e.queueUp.length + e.queueDown.length;
      const score = eta + load;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
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
    this.gcIdemp();

    for (let i = 0; i < 50 && this.queue.length > 0; i++) {
      const cmd = this.queue.shift()!;
      if (cmd.type === 'call') {
        this.assignHallCall({ floor: cmd.floor, direction: cmd.direction, ts: cmd.ts });
      } else if (cmd.type === 'select') {
        const e = this.state.elevators.find((x) => x.id === cmd.elevatorId);
        if (e) this.enqueueTarget(e, cmd.floor);
      }
    }

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

      const anyAbove =
        e.queueUp.some((f) => f > e.currentFloor) ||
        e.queueDown.some((f) => f > e.currentFloor) ||
        Array.from(e.targets).some((f) => f > e.currentFloor);

      const anyBelow =
        e.queueDown.some((f) => f < e.currentFloor) ||
        e.queueUp.some((f) => f < e.currentFloor) ||
        Array.from(e.targets).some((f) => f < e.currentFloor);

      if (e.direction === 'up' && !anyAbove) {
        if (anyBelow) {
          e.direction = 'down';
          e.moveTicks = 0;
        } else {
          e.direction = 'idle';
          e.moveTicks = 0;
          continue;
        }
      } else if (e.direction === 'down' && !anyBelow) {
        if (anyAbove) {
          e.direction = 'up';
          e.moveTicks = 0;
        } else {
          e.direction = 'idle';
          e.moveTicks = 0;
          continue;
        }
      } else if (e.direction === 'idle') {
        if (anyAbove && !anyBelow) e.direction = 'up';
        else if (!anyAbove && anyBelow) e.direction = 'down';
        else if (anyAbove && anyBelow) {
          const higher = [
            ...e.queueUp.filter((f) => f > e.currentFloor),
            ...e.queueDown.filter((f) => f > e.currentFloor),
            ...Array.from(e.targets).filter((f) => f > e.currentFloor),
          ];
          const lower = [
            ...e.queueDown.filter((f) => f < e.currentFloor),
            ...e.queueUp.filter((f) => f < e.currentFloor),
            ...Array.from(e.targets).filter((f) => f < e.currentFloor),
          ];
          const nearestAbove = Math.min(...higher);
          const nearestBelow = Math.max(...lower);
          const distUp = Number.isFinite(nearestAbove)
            ? Math.abs(nearestAbove - e.currentFloor)
            : Infinity;
          const distDown = Number.isFinite(nearestBelow)
            ? Math.abs(nearestBelow - e.currentFloor)
            : Infinity;
          e.direction = distUp <= distDown ? 'up' : 'down';
        } else {
          e.moveTicks = 0;
          continue;
        }
      }

      if (!anyAbove && !anyBelow && e.targets.size === 0) {
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

    this.maybeSnapshot();
  }
}
