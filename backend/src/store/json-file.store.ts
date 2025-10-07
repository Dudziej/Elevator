import { promises as fs } from 'fs';
import { join } from 'path';
import type { StateStore } from '../core/store';
import type { SystemState, Elevator } from '../core/types';

type PersistedElevator = Omit<Elevator, 'targets'> & { targets: number[] };
type PersistedState = Omit<SystemState, 'elevators'> & { elevators: PersistedElevator[] };

export class JsonFileStore implements StateStore {
  constructor(private readonly filePath = join(process.cwd(), 'state.json')) {}

  async save(state: SystemState): Promise<void> {
    // Konwersja Set -> number[]
    const persisted: PersistedState = {
      ...state,
      elevators: state.elevators.map((e) => ({
        ...e,
        targets: Array.from(e.targets),
      })),
    };
    await fs.writeFile(this.filePath, JSON.stringify(persisted, null, 2), 'utf-8');
  }

  async load(): Promise<SystemState | null> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed: PersistedState = JSON.parse(raw) as PersistedState;

      const elevators: Elevator[] = parsed.elevators.map((e) => ({
        ...e,
        targets: new Set<number>(e.targets),
      }));

      const state: SystemState = {
        ...parsed,
        elevators,
      };
      return state;
    } catch {
      return null;
    }
  }
}
