import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApartmentModule } from '../apartment/apartment.module';
import { AvailabilityModule } from '../availability/availability.module';
import { PaymentModule } from '../payment/payment.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingRepository } from './repositories/booking.repository';
import { Booking, BookingSchema } from './schemas/booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    ApartmentModule,
    forwardRef(() => PaymentModule),
    forwardRef(() => AvailabilityModule),
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingRepository],
  exports: [BookingService],
})
export class BookingModule {}
