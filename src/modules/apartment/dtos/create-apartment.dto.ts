import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateApartmentDto {
  @ApiProperty({
    description: 'This is the name or title of the apartment.',
    example: 'Luxury Ocean View Apartment',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'This is the description of the apartment.',
    example: 'Telling prospective client more about the apartment.',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'This is the price per night for the apartment.',
    example: 250000,
  })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  pricePerNight!: number;

  @ApiProperty({
    description: 'This is the number of units of the apartment available.',
    example: 20,
  })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  totalUnits!: number;

  @ApiProperty({
    description:
      'This is the number of bedrooms available in each of the apartment.',
    example: 20,
  })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  bedrooms!: number;

  @ApiProperty({
    description:
      'This is the number of bathrooms available in each of the apartment.',
    example: 20,
  })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  bathrooms!: number;

  @ApiProperty({
    description:
      'This is the maximum number of guests allowed in each of the apartment.',
    example: 20,
  })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  guests!: number;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  // @Transform(({ value }) => {
  //   if (!value) return [];
  //   if (Array.isArray(value)) return value;
  //   if (typeof value === 'string') return [value];
  // })
  @Transform(({ value }) => {
    if (!value) return [];

    // Case 1: Already an array
    if (Array.isArray(value)) {
      // Swagger sometimes sends: ['Wifi,PS5']
      if (value.length === 1 && typeof value[0] === 'string') {
        return value[0].split(',').map((item) => item.trim());
      }

      return value.map((item) => String(item).trim());
    }

    // Case 2: String (from form-data)
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback to comma split
        return value.split(',').map((item) => item.trim());
      }
    }

    return [];
  })
  amenities?: string[];

  // Optional (only if admin can set it)
  @ApiProperty({
    description:
      'This is letting us know if the apartment should be included in featured card on the frontend.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
