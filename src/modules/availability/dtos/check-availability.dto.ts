import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';

export class CheckAvailabilityDto {
  @ApiProperty({
    description:
      'This is the date of the day that the customer is going to check into the apartment.',
    example: '2026-09-01',
  })
  @IsNotEmpty()
  @IsDateString()
  checkInDate!: string; // e.g., "2026-09-01"

  @ApiProperty({
    description:
      'This is the date of the day that the customer is going to check out of the apartment.',
    example: '2026-09-05',
  })
  @IsNotEmpty()
  @IsDateString()
  checkOutDate!: string; // e.g., "2026-09-05"

  @ApiPropertyOptional({
    description:
      'This is the number of units that the customer is booking. It is optional as it will assume 1.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  unitsRequested?: number = 1;
}
