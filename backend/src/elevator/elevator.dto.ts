import { IsIn, IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class CallDto {
  @IsInt() @Min(0) floor!: number;
  @IsIn(['up','down']) direction!: 'up'|'down';
}

export class SelectDto {
  @IsInt() @Min(0) elevatorId!: number;
  @IsInt() @Min(0) floor!: number;
}

export class ResetDto {
  @IsOptional() @IsInt() @Min(1) floors?: number;
  @IsOptional() @IsInt() @Min(1) elevators?: number;
  @IsOptional() @IsInt() @Min(1) ticksPerFloor?: number;
  @IsOptional() @IsInt() @Min(1) doorOpenTicks?: number;
  @IsOptional() @IsInt() @Min(10) tickMs?: number;
}
