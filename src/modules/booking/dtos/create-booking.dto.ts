import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'This is the apartment ID',
    example: '39283u4jhey3ye848w94jrj332',
  })
  @IsMongoId()
  apartment!: string;

  @ApiProperty({
    description:
      'This is the date that the client is going to check in to the apartment.',
    example: '2026-07-25',
  })
  @IsDateString()
  checkInDate!: Date;

  @ApiProperty({
    description:
      'This is the date that the client is going to check out of the apartment.',
    example: '2026-07-31',
  })
  @IsDateString()
  checkOutDate!: Date;

  @ApiProperty({
    description:
      'This is the first name of the user that is booking the apartment.',
    example: 'John',
  })
  @IsString()
  firstName!: string;

  @ApiProperty({
    description:
      'This is the last name of the user that is booking the apartment.',
    example: 'Doe',
  })
  @IsString()
  lastName!: string;

  @ApiProperty({
    description:
      'This is the email address of the user that is booking the apartment.',
    example: 'johndoe@example.com',
  })
  @IsString()
  email!: string;

  @ApiProperty({
    description:
      'This is the phone number of the user that is booking the apartment. Accepted formats: +2348012345678 or 08012345678',
    example: '+2348012345678',
  })
  @IsString()
  phoneNumber!: string;

  @ApiPropertyOptional({
    description:
      'This is the user ID of the user that is booking the apartment. This is optional since we are going to be allowing guest to book.',
    example: '39283u4jhey3ye848w94jrj332',
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;
}
