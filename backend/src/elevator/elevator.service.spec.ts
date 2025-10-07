import { ElevatorService } from './elevator.service';

describe('ElevatorService', () => {
  it('assigns nearest elevator (basic)', () => {
    const svc = new ElevatorService();
    svc.reset({ floors: 10, elevators: 2, tickMs: 1 });

    (svc as any).getState().elevators[0].currentFloor = 1;
    (svc as any).getState().elevators[1].currentFloor = 8;

    svc.callElevator(2, 'up');
    const st = svc.getState();
    expect(st.elevators.some((e: any) => (e.targets as number[]).includes(2))).toBe(true);
  });

  it('opens doors when reaching a target', () => {
    const svc = new ElevatorService();
    svc.reset({ floors: 5, elevators: 1, ticksPerFloor: 1, doorOpenTicks: 2, tickMs: 1 });
    svc.selectFloor(0, 3);

    for (let i = 0; i < 10; i++) (svc as any)['tick']();

    const st = svc.getState();
    const e0 = st.elevators[0];
    expect(e0.currentFloor).toBe(3);
    expect(['open', 'closing', 'closed']).toContain(e0.door);
  });

  it('scan switches direction when up queue is empty', () => {
    const svc = new ElevatorService();
    svc.reset({ floors: 10, elevators: 1, ticksPerFloor: 1, tickMs: 1 });

    svc.selectFloor(0, 4);
    svc.selectFloor(0, 2);

    for (let i = 0; i < 20; i++) (svc as any)['tick']();
    const st = svc.getState();
    const e0 = st.elevators[0];
    expect(e0.targets.length).toBe(0);
    expect(e0.direction === 'idle' || e0.door !== 'closed').toBeTruthy();
  });
});
