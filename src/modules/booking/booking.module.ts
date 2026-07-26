import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApartmentModule } from '../apartment/apartment.module';
import { PaymentModule } from '../payment/payment.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingRepository } from './repositories/booking.repository';
import { Booking, BookingSchema } from './schemas/booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    ApartmentModule,
    PaymentModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingRepository],
})
export class BookingModule {}
