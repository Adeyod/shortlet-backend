import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsString } from 'class-validator';

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
    example: '',
  })
  @IsDateString()
  checkInDate!: Date;

  @ApiProperty({
    description:
      'This is the date that the client is going to check out of the apartment.',
    example: '',
  })
  @IsDateString()
  checkOutDate!: Date;

  @ApiProperty({
    description:
      'This is the first name of the user that is booking the apartment.',
  })
  @IsString()
  firstName!: string;

  @ApiProperty({
    description:
      'This is the last name of the user that is booking the apartment.',
  })
  @IsString()
  lastName!: string;

  @ApiProperty({
    description:
      'This is the email address of the user that is booking the apartment.',
  })
  @IsString()
  email!: string;

  @ApiProperty({
    description:
      'This is the phone number of the user that is booking the apartment.',
  })
  @IsString()
  phoneNumber!: string;

  @ApiProperty({
    description:
      'This is the user ID of the user that is booking the apartment. This is optional since we are going to be allowing guest to book.',
  })
  @IsString()
  userId?: string;
}
