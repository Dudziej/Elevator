import { Controller, Get } from '@nestjs/common';
import { ElevatorService } from './elevator.service';

@Controller('elevator')
export class ElevatorController {
  constructor(private readonly svc: ElevatorService) {}

  @Get('ping')
  ping() {
    return this.svc.getPing();
  }
}
