import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../users/schemas/user.schema';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dtos/create-booking.dto';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('create-booking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Booking created successfully')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create booking.',
    description:
      'This is the endpoint to call when user want to book apartment and this endpoint will return with payment link.',
  })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unable to create booking.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
    return await this.bookingService.createBooking(dto, req.user.id);
  }
}
