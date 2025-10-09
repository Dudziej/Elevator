import type { SystemState } from '../core/types';

export interface StateStore {
  load(): Promise<SystemState | null>;
  save(state: SystemState): Promise<void>;
}
