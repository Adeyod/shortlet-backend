import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetCurrentUser } from '../../common/decorators/get-current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { QueryWithPaginationDto } from '../../common/dto/query-with-pagination';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { PaymentProvider } from '../payment/enums/payment-provider.enum';
import { Role } from '../users/schemas/user.schema';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dtos/create-booking.dto';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('create-booking/:provider')
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
  async createBooking(
    @Param('provider') provider: PaymentProvider,
    @Body() dto: CreateBookingDto,
  ) {
    return await this.bookingService.createBooking(dto, provider);
  }

  @Get('all-bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Bookings fetched successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'This is the endpoint for fetching all the bookings on the application.',
    description:
      'Admin will be using this endpoint to get all the booking on the application for administrative purpose.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookings fetched successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Unable to fetched bookings.',
  })
  @ApiResponse({
    status: 404,
    description: 'Bookings not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async getAllBookings(@Query() dto: QueryWithPaginationDto) {
    const response = await this.bookingService.getAllBookings(dto);

    return response;
  }

  @Get('my-bookings/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Bookings fetched successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'This is the endpoint for fetching all the bookings of the logged in user.',
    description:
      'This endpoint will be used to get all the booking of the logged in user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookings fetched successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Unable to fetched bookings.',
  })
  @ApiResponse({
    status: 404,
    description: 'Bookings not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async getAllMyBookings(
    @GetCurrentUser() user: JwtUser,
    @Param('userId') userId: string,
    @Query() dto: QueryWithPaginationDto,
  ) {
    const response = await this.bookingService.getAllMyBookings(
      user,
      userId,
      dto,
    );

    return response;
  }

  @Get('get-booking-by-id/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Booking fetched successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'This is the endpoint for fetching booking by ID.',
    description:
      'This endpoint is for fetching booking details from the database. It can be used by Admin and the user that own the booking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking fetched successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Unable to fetched booking.',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async getBookingById(
    @Param('bookingId') bookingId: string,
    @GetCurrentUser() user: JwtUser,
  ) {
    const response = await this.bookingService.getBookingById(bookingId, user);

    return response;
  }
  @Put('delete-booking-by-id/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Booking deleted successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'This is the endpoint for deleting booking by ID.',
    description:
      'This endpoint is for deleting booking details from the database. It can be used by the user that own the booking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking deleted successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Unable to deleted booking.',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async deleteBookingById(
    @Param('bookingId') bookingId: string,
    @GetCurrentUser() user: JwtUser,
  ) {
    const response = await this.bookingService.deleteBookingById(
      bookingId,
      user,
    );

    return response;
  }
}
