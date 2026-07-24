import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Role } from '../../../modules/users/schemas/user.schema';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Access token for authentication',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YzY3MDY1OC1kZTdlLTQ2ODctYmE0Mi1hY2EzMTZkZjc4NGUiLCJlbWFpbCI6ImF5b2RlamlhZGVib2x1QGdtYWlsLmNvbSIsImlhdCI6MTc3MDQwNjQ2MSwiZXhwIjoxNzcwNDA3MzYxfQ.1yOgYaxC_0czQF_aaYOYx4s064FHUWZR3R9ZKfDuAvQ',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh token for authentication',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YzY3MDY1OC1kZTdlLTQ2ODctYmE0Mi1hY2EzMTZkZjc4NGUiLCJlbWFpbCI6ImF5b2RlamlhZGVib2x1QGdtYWlsLmNvbSIsImlhdCI6MTc3MDQwNjQ2MSwiZXhwIjoxNzcwNDA3MzYxfQ.1yOgYaxC_0czQF_aaYOYx4s064FHUWZR3R9ZKfDuAvQ',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Authenticated User information',
    example: {
      _id: '2039difur849e0403e940e9',
      email: 'john.doe@example.com',
      role: 'USER',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '09049384726',
      isVerified: true,
    },
  })
  user!: {
    _id: Types.ObjectId;
    email: string;
    role: Role;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    isVerified: boolean;
  };

  @ApiProperty({
    description: 'Successful registration message',
    example:
      'Registration successful. Please verify your account using the token sent to your email address.',
  })
  message?: string;

  @ApiProperty({
    description: 'Indicate whether registration is sucessful or not.',
    example: true,
  })
  success?: boolean;
}
