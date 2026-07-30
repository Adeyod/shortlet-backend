import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApartmentModule } from '../apartment/apartment.module';
import { BookingModule } from '../booking/booking.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityRepository } from './repositories/availability.repository';
import {
  Availability,
  AvailabilitySchema,
} from './schemas/availability.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Availability.name, schema: AvailabilitySchema },
    ]),
    ApartmentModule,
    forwardRef(() => BookingModule),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityRepository],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
