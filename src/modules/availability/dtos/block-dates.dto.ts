import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, Min } from 'class-validator';

export class AdminBlockDatesDto {
  @ApiProperty({
    description:
      'This is the date of the first day that the admin is blocking.',
    example: '2026-09-01',
  })
  @IsNotEmpty()
  @IsDateString()
  checkInDate!: string;

  @ApiProperty({
    description: 'This is the date of the last day that the admin is blocking.',
    example: '2026-09-05',
  })
  @IsNotEmpty()
  @IsDateString()
  checkOutDate!: string;

  @ApiProperty({
    description: 'This is the number of units that the admin is blocking.',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  unitsToBlock!: number;
}
