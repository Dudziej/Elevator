import { Module } from '@nestjs/common';
import { ElevatorModule } from './elevator/elevator.module';

@Module({
  imports: [ElevatorModule],
})
export class AppModule {}
