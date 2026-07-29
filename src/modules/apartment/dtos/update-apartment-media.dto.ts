import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum MediaUpdateAction {
  APPEND = 'append',
  REPLACE = 'replace',
}

export class UpdateApartmentMediaDto {
  @IsEnum(MediaUpdateAction)
  action!: MediaUpdateAction;

  // IDs or URLs of media to remove
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeMedia?: string[];
}
