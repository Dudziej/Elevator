import { Module } from '@nestjs/common';
import { ElevatorService } from './elevator.service';
import { ElevatorController } from './elevator.controller';

@Module({
  providers: [ElevatorService],
  controllers: [ElevatorController],
})
export class ElevatorModule {}
