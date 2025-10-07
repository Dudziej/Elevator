import type { SystemState } from './types';

export interface StateStore {
  save(state: SystemState): Promise<void>;
  load(): Promise<SystemState | null>;
}
