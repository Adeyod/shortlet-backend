import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum MediaUpdateAction {
  APPEND = 'append',
  REPLACE = 'replace',
}

export class UpdateApartmentMediaDto {
  @IsEnum(MediaUpdateAction)
  action!: MediaUpdateAction;

  // IDs or URLs of media to remove
  @ApiPropertyOptional({})
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
  removeMedia?: string[];
}
