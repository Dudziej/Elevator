import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class CallDto {
  @ApiProperty({ description: 'Floor number to call the elevator to', example: 7, minimum: 0 })
  @IsInt()
  @Min(0)
  floor!: number;

  @ApiProperty({ description: 'Desired direction', enum: ['up', 'down'], example: 'up' })
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}

export class SelectDto {
  @ApiProperty({ description: 'Elevator ID (0..n-1)', example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  elevatorId!: number;

  @ApiProperty({
    description: 'Target floor selected from inside the elevator',
    example: 12,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  floor!: number;
}

export class ResetDto {
  @ApiPropertyOptional({ description: 'Number of floors (0..floors-1)', example: 16, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  floors?: number;

  @ApiPropertyOptional({ description: 'Number of elevators', example: 4, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  elevators?: number;

  @ApiPropertyOptional({
    description: 'Ticks needed to move between adjacent floors',
    example: 5,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  ticksPerFloor?: number;

  @ApiPropertyOptional({ description: 'How many ticks doors remain open', example: 6, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  doorOpenTicks?: number;

  @ApiPropertyOptional({ description: 'Tick length in milliseconds', example: 200, minimum: 10 })
  @IsOptional()
  @IsInt()
  @Min(10)
  tickMs?: number;
}
