import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { ElevatorService } from './elevator.service';
import { CallDto, ResetDto, SelectDto } from './elevator.dto';

@Controller('elevator')
export class ElevatorController {
  constructor(private readonly svc: ElevatorService) {}

  @Get('state') getState() {
    return this.svc.getState();
  }

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

  @Post('pause') @ApiExcludeEndpoint() pause() {
    this.svc.pause();
    return { ok: true };
  }

  @Post('resume') @ApiExcludeEndpoint() resume() {
    this.svc.resume();
    return { ok: true };
  }

  @Post('step') @ApiExcludeEndpoint() step(@Query('n') n?: string) {
    this.svc.step(Number(n ?? 1));
    return { ok: true };
  }

  @Post('snapshot')
  @ApiExcludeEndpoint()
  snapshot() {
    return { ok: true };
  }
}
