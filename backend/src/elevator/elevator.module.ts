import { Module } from '@nestjs/common';
import { ElevatorService } from './elevator.service';
import { ElevatorController } from './elevator.controller';
import { JsonFileStore } from '../store/json-file.store';
import { ElevatorGateway } from '../realtime/elevator.gateway';

@Module({
  providers: [
    { provide: 'STATE_STORE', useClass: JsonFileStore },
    ElevatorService,
    ElevatorGateway,
  ],
  controllers: [ElevatorController],
})
export class ElevatorModule {}
