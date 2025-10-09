import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { SystemState, Elevator, HallCall } from '../core/types';
import type { StateStore } from './types';

type RawElevator = Partial<Omit<Elevator, 'targets' | 'queueUp' | 'queueDown'>> & {
  targets?: unknown;
  queueUp?: unknown;
  queueDown?: unknown;
};

interface RawState {
  config?: {
    floors?: unknown;
    elevators?: unknown;
    ticksPerFloor?: unknown;
    doorOpenTicks?: unknown;
    tickMs?: unknown;
  };
  elevators?: unknown;
  pendingHallCalls?: unknown;
  ts?: unknown;
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

const asNumberArray = (u: unknown): number[] => (Array.isArray(u) ? u.filter(isInt) : []);

const isHallCall = (u: unknown): u is HallCall => {
  if (typeof u !== 'object' || u === null) return false;
  const o = u as Record<string, unknown>;
  return isInt(o.floor) && (o.direction === 'up' || o.direction === 'down') && isInt(o.ts);
};

const getInt = (o: Record<string, unknown>, k: string, def = 0): number =>
  isInt(o[k]) ? o[k] : def;

const getDir = (o: Record<string, unknown>): Elevator['direction'] => {
  const v = o['direction'];
  return v === 'up' || v === 'down' || v === 'idle' ? v : 'idle';
};

const getDoor = (o: Record<string, unknown>): Elevator['door'] => {
  const v = o['door'];
  return v === 'open' || v === 'opening' || v === 'closing' || v === 'closed' ? v : 'closed';
};

export class JsonFileStore implements StateStore {
  private readonly file: string;

  constructor(file?: string) {
    this.file = file ?? path.join(process.cwd(), 'state.json');
  }

  async load(): Promise<SystemState | null> {
    try {
      const raw = await fsp.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw) as unknown;

      const data = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as RawState;
      const cfg = data.config ?? {};

      const floors = cfg.floors;
      const elevatorsCnt = cfg.elevators;
      const tpf = cfg.ticksPerFloor;
      const dot = cfg.doorOpenTicks;
      const tickMs = cfg.tickMs;

      if (!isInt(floors) || floors <= 0) return null;
      if (!isInt(elevatorsCnt) || elevatorsCnt <= 0) return null;
      if (!isInt(tpf) || tpf <= 0) return null;
      if (!isInt(dot) || dot <= 0) return null;
      if (!isInt(tickMs) || tickMs <= 0) return null;

      const rawElevators: RawElevator[] = Array.isArray(data.elevators)
        ? ((data.elevators as unknown[]).map((e) => e ?? {}) as RawElevator[])
        : [];

      const elevators: Elevator[] = rawElevators.map((re, idx) => {
        const obj = re as Record<string, unknown>;

        const targets = new Set<number>(asNumberArray(re.targets));
        const queueUp = asNumberArray(re.queueUp);
        const queueDown = asNumberArray(re.queueDown);

        const currentFloor = getInt(obj, 'currentFloor', 0);
        const direction = getDir(obj);
        const door = getDoor(obj);
        const doorTicks = getInt(obj, 'doorTicks', 0);
        const moveTicks = getInt(obj, 'moveTicks', 0);
        const id = getInt(obj, 'id', idx);

        return {
          id,
          currentFloor,
          direction,
          door,
          doorTicks,
          moveTicks,
          targets,
          queueUp,
          queueDown,
        };
      });

      const pendingHallCallsRaw = Array.isArray(data.pendingHallCalls)
        ? (data.pendingHallCalls as unknown[])
        : [];
      const pendingHallCalls: HallCall[] = pendingHallCallsRaw.filter(isHallCall);

      const ts = isInt(data.ts) ? data.ts : Date.now();

      return {
        config: { floors, elevators: elevatorsCnt, ticksPerFloor: tpf, doorOpenTicks: dot, tickMs },
        elevators,
        pendingHallCalls,
        ts,
      };
    } catch {
      return null;
    }
  }

  async save(state: SystemState): Promise<void> {
    const json = JSON.stringify(
      {
        ...state,
        elevators: state.elevators.map((e) => ({
          ...e,
          targets: Array.from(e.targets),
        })),
      },
      null,
      2,
    );
    await fsp.writeFile(this.file, json, 'utf8');
  }
}
