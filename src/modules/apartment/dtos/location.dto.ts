import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class LocationDto {
  @ApiProperty({ example: '12 Admiralty Way' })
  @IsString()
  address!: string;

  @ApiProperty({ example: 'Lekki' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  state!: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  country!: string;

  @ApiProperty({ example: 6.4474 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  latitude?: number;

  @ApiProperty({ example: 3.4723 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  longitude?: number;
}
