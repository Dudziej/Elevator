import { Body, Controller, Get, Post } from '@nestjs/common';
import { ElevatorService } from './elevator.service';
import { CallDto, ResetDto, SelectDto } from './elevator.dto';

@Controller('elevator')
export class ElevatorController {
  constructor(private readonly svc: ElevatorService) {}

  @Get('state') getState() { return this.svc.getState(); }

  @Post('reset') reset(@Body() cfg: ResetDto) {
    this.svc.reset(cfg);
    return { ok: true };
  }

  @Post('call') call(@Body() dto: CallDto) {
    this.svc.callElevator(dto.floor, dto.direction);
    return { ok: true };
  }

  @Post('select') select(@Body() dto: SelectDto) {
    this.svc.selectFloor(dto.elevatorId, dto.floor);
    return { ok: true };
  }
}
