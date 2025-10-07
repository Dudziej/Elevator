import { Body, Controller, Get, Post } from '@nestjs/common';
import { ElevatorService } from './elevator.service';

@Controller('elevator')
export class ElevatorController {
  constructor(private readonly svc: ElevatorService) {}

  @Get('state') getState() { return this.svc.getState(); }

  @Post('reset')
  reset(@Body() cfg?: Partial<{ floors:number; elevators:number; ticksPerFloor:number; doorOpenTicks:number; tickMs:number }>) {
    this.svc.reset(cfg);
    return { ok: true };
  }

  @Post('call')
  call(@Body() dto: { floor: number; direction: 'up'|'down' }) {
    this.svc.callElevator(dto.floor, dto.direction);
    return { ok: true };
  }

  @Post('select')
  select(@Body() dto: { elevatorId: number; floor: number }) {
    this.svc.selectFloor(dto.elevatorId, dto.floor);
    return { ok: true };
  }
}
