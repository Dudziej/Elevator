import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiExtraModels,
  getSchemaPath,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { ElevatorService } from './elevator.service';
import { CallDto, ResetDto, SelectDto } from './elevator.dto';
import { OkVm, SystemStateVm } from './elevator.view-model';

@ApiTags('Elevator')
@ApiExtraModels(SystemStateVm, OkVm)
@Controller('elevator')
export class ElevatorController {
  constructor(private readonly svc: ElevatorService) {}

  @Get('state')
  @ApiOperation({ summary: 'Get current system snapshot' })
  @ApiOkResponse({ description: 'System state', schema: { $ref: getSchemaPath(SystemStateVm) } })
  getState() {
    return this.svc.getState();
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset system with optional config' })
  @ApiBody({
    type: ResetDto,
    examples: {
      default: {
        summary: 'Change number of floors & elevators',
        value: { floors: 12, elevators: 3, tickMs: 150 },
      },
    },
  })
  @ApiOkResponse({ description: 'Ack', schema: { $ref: getSchemaPath(OkVm) } })
  reset(@Body() cfg: ResetDto) {
    this.svc.reset(cfg);
    return { ok: true };
  }

  @Post('call')
  @ApiOperation({ summary: 'Call an elevator to a floor with direction' })
  @ApiBody({
    type: CallDto,
    examples: {
      upCall: { value: { floor: 7, direction: 'up' } },
      downCall: { value: { floor: 12, direction: 'down' } },
    },
  })
  @ApiOkResponse({ description: 'Ack', schema: { $ref: getSchemaPath(OkVm) } })
  call(@Body() dto: CallDto) {
    this.svc.callElevator(dto.floor, dto.direction);
    return { ok: true };
  }

  @Post('select')
  @ApiOperation({ summary: 'Select target floor from inside the elevator' })
  @ApiBody({
    type: SelectDto,
    examples: { sample: { value: { elevatorId: 0, floor: 14 } } },
  })
  @ApiOkResponse({ description: 'Ack', schema: { $ref: getSchemaPath(OkVm) } })
  select(@Body() dto: SelectDto) {
    this.svc.selectFloor(dto.elevatorId, dto.floor);
    return { ok: true };
  }

  @Post('pause')
  @ApiExcludeEndpoint()
  pause() {
    this.svc.pause();
    return { ok: true };
  }

  @Post('resume')
  @ApiExcludeEndpoint()
  resume() {
    this.svc.resume();
    return { ok: true };
  }

  @Post('step')
  @ApiExcludeEndpoint()
  step() {
    this.svc.step(1);
    return { ok: true };
  }

  @Post('snapshot')
  @ApiExcludeEndpoint()
  snapshot() {
    return { ok: true };
  }
}
