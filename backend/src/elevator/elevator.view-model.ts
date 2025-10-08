import { ApiProperty } from '@nestjs/swagger';

export class SystemConfigVm {
  @ApiProperty({ example: 16 }) floors!: number;
  @ApiProperty({ example: 4 }) elevators!: number;
  @ApiProperty({ example: 5 }) ticksPerFloor!: number;
  @ApiProperty({ example: 6 }) doorOpenTicks!: number;
  @ApiProperty({ example: 200 }) tickMs!: number;
}

export class ElevatorVm {
  @ApiProperty({ example: 0 }) id!: number;
  @ApiProperty({ example: 7 }) currentFloor!: number;
  @ApiProperty({ example: 'up', enum: ['up', 'down', 'idle'] }) direction!: string;
  @ApiProperty({ example: 'open', enum: ['opening', 'open', 'closing', 'closed'] }) door!: string;
  @ApiProperty({ example: 3 }) doorTicks!: number;
  @ApiProperty({ example: 0 }) moveTicks!: number;
  @ApiProperty({ type: [Number], example: [9, 12] }) targets!: number[];
  @ApiProperty({ type: [Number], example: [8, 9, 12] }) queueUp!: number[];
  @ApiProperty({ type: [Number], example: [5, 3, 1] }) queueDown!: number[];
}

export class HallCallVm {
  @ApiProperty({ example: 5 }) floor!: number;
  @ApiProperty({ example: 'up', enum: ['up', 'down'] }) direction!: string;
  @ApiProperty({ example: 1728400000000 }) ts!: number;
}

export class SystemStateVm {
  @ApiProperty({ type: SystemConfigVm }) config!: SystemConfigVm;
  @ApiProperty({ type: [ElevatorVm] }) elevators!: ElevatorVm[];
  @ApiProperty({ type: [HallCallVm] }) pendingHallCalls!: HallCallVm[];
  @ApiProperty({ example: 1728400001234 }) ts!: number;
}

export class OkVm {
  @ApiProperty({ example: true }) ok!: boolean;
}
