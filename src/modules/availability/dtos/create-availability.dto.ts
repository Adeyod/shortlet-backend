import { IsDateString, IsMongoId, IsNumber } from 'class-validator';

export class CreateAvailabilityDto {
  @IsMongoId()
  apartmentId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsNumber()
  totalUnits!: number;
}
