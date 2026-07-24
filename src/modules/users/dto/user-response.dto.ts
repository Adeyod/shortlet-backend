import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Role } from '../schemas/user.schema';

export class UserResponseDto {
  @ApiProperty({
    description: 'user ID',
    example: 'ei3392ue8394jf9550dj49fj',
  })
  _id!: Types.ObjectId;

  @ApiProperty({
    description: 'user ID',
    example: 'john.doe@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'user First name',
    example: 'John',
  })
  firstName!: string;

  @ApiProperty({
    description: 'user Lastname',
    example: 'Doe',
  })
  lastName!: string;

  @ApiProperty({
    description: 'User Password',
    example: 'StrongP@ssword!',
  })
  password?: string;

  @ApiProperty({
    description: 'user Role',
    example: 'USER',
  })
  role!: Role;

  @ApiProperty({
    description: 'Phone Number',
    example: '08039383737',
  })
  phoneNumber!: string;

  @ApiProperty({
    description: 'Email verification status',
    example: true,
  })
  isVerified!: boolean;
}
