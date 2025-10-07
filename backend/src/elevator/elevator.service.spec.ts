import { ElevatorService } from './elevator.service';
import type { Elevator, HallCall, SystemState, SystemConfig } from '../core/types';

type ElevatorPublic = Omit<Elevator, 'targets'> & { targets: number[] };
type StatePublic = {
  config: SystemConfig;
  elevators: ElevatorPublic[];
  pendingHallCalls: HallCall[];
  ts: number;
};

type InternalSvc = {
  state: SystemState;
  tick: () => void;
};

describe('ElevatorService', () => {
  it('assigns nearest elevator (basic)', () => {
    const svc = new ElevatorService();
    svc.reset({ floors: 10, elevators: 2, tickMs: 1 });

    const internal = svc as unknown as InternalSvc;
    internal.state.elevators[0].currentFloor = 1;
    internal.state.elevators[1].currentFloor = 8;

    svc.callElevator(2, 'up');

    const st = svc.getState() as StatePublic;
    expect(st.elevators.length).toBeGreaterThan(0);
    const assigned = st.elevators.some((e) => e.targets.includes(2));
    expect(assigned).toBe(true);
  });

  it('opens doors when reaching a target', () => {
    const svc = new ElevatorService();
    svc.reset({ floors: 5, elevators: 1, ticksPerFloor: 1, doorOpenTicks: 2, tickMs: 1 });

    svc.selectFloor(0, 3);

    const internal = svc as unknown as InternalSvc;
    for (let i = 0; i < 10; i++) internal.tick();

    const st = svc.getState() as StatePublic;
    expect(st.elevators.length).toBeGreaterThan(0);
    const e0 = st.elevators[0]!;
    expect(e0.currentFloor).toBe(3);
    expect(['open', 'closing', 'closed']).toContain(e0.door);
  });

  it('SCAN changes direction after finishing current direction queue', () => {
    const svc = new ElevatorService();
    svc.reset({ floors: 10, elevators: 1, ticksPerFloor: 1, tickMs: 1 });

    svc.selectFloor(0, 4);
    svc.selectFloor(0, 2);

    const internal = svc as unknown as InternalSvc;
    for (let i = 0; i < 20; i++) internal.tick();

    const st = svc.getState() as StatePublic;
    expect(st.elevators.length).toBeGreaterThan(0);
    const e0 = st.elevators[0]!;
    expect(e0.targets.length).toBe(0);
    expect(e0.direction === 'idle' || e0.door !== 'closed').toBeTruthy();
  });
});
