import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { ApartmentService } from '../apartment/apartment.service';
import { PaymentProvider } from '../payment/enums/payment-provider.enum';
import { PaymentService } from '../payment/payment.service';
import { CreateBookingDto } from './dtos/create-booking.dto';
import { BookingRepository } from './repositories/booking.repository';

@Injectable()
export class BookingService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly bookingRepo: BookingRepository,

    private readonly apartmentService: ApartmentService,
    private readonly paymentService: PaymentService,
  ) {}

  async createBooking(dto: CreateBookingDto, provider: PaymentProvider) {
    const { apartment, checkInDate, checkOutDate } = dto;

    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      throw new BadRequestException({
        message: 'Invalid date range',
        success: false,
        status: 400,
      });
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    const apartmentDoc =
      await this.apartmentService.findApartmentByIdWithSession(
        apartment,
        session,
      );

    if (!apartmentDoc) {
      throw new NotFoundException({
        message: 'Apartment not found',
        status: 404,
        success: false,
      });
    }

    const totalUnits = apartmentDoc.totalUnits;

    const overlappingCount =
      await this.bookingRepo.countOverlappingBookingsWithSession(
        apartment,
        new Date(checkInDate),
        new Date(checkOutDate),
        session,
      );

    if (overlappingCount >= totalUnits) {
      throw new BadRequestException({
        message: 'No available units for selected dates',
        success: false,
        status: 400,
      });
    }

    const data = {
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      apartment: new Types.ObjectId(dto.apartment),
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      user: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
    };

    const booking = await this.bookingRepo.createBookingWithSession(
      data,
      session,
    );

    if (!booking) {
      throw new BadRequestException({
        message: 'Unable to create booking.',
        success: false,
        status: 400,
      });
    }

    const totalAmount = this.calculateTotalAmount(
      new Date(checkInDate),
      new Date(checkOutDate),
      apartmentDoc.pricePerNight,
    );

    const input = {
      bookingId: booking._id,
      email: dto.email,
      amount: totalAmount,
      userId: dto.userId ? new Types.ObjectId(dto.userId) : booking._id,
    };
    const paymentIntent = await this.paymentService.createPaymentIntent(
      provider,
      input,
    );

    return paymentIntent;
  }

  private calculateTotalAmount(
    checkInDate: Date,
    checkOutDate: Date,
    pricePerNight: number,
  ): number {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    const diffInMs =
      new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();

    const numberOfNights = Math.ceil(diffInMs / millisecondsPerDay);

    if (numberOfNights <= 0) {
      throw new BadRequestException({
        message: 'Invalid booking duration',
        success: false,
        status: 400,
      });
    }

    const totalAmount = numberOfNights * pricePerNight;

    return totalAmount;
  }
}
