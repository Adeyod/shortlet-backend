import { Body, Controller, Post, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dtos/create-booking.dto';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
    return await this.bookingService.createBooking(dto, req.user.id);
  }
}
