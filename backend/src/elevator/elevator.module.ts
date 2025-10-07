import { Module } from '@nestjs/common';
import { ElevatorService } from './elevator.service';
import { ElevatorController } from './elevator.controller';
import { JsonFileStore } from '../store/json-file.store';

@Module({
  providers: [{ provide: 'STATE_STORE', useClass: JsonFileStore }, ElevatorService],
  controllers: [ElevatorController],
})
export class ElevatorModule {}
