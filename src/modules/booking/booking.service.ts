import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { QueryWithPaginationDto } from '../../common/dto/query-with-pagination';
import { JwtUser } from '../../common/types/jwt-user.type';
import { ApartmentService } from '../apartment/apartment.service';
import { ApartmentDocument } from '../apartment/schemas/apartment.schema';
import { AvailabilityService } from '../availability/availability.service';
import { PaymentProvider } from '../payment/enums/payment-provider.enum';
import { PaymentService } from '../payment/payment.service';
import { Role } from '../users/schemas/user.schema';
import { CreateBookingDto } from './dtos/create-booking.dto';
import { BookingStatus } from './enums/booking-status.enum';
import { BookingRepository } from './repositories/booking.repository';
import { BookingDocument } from './schemas/booking.schema';

@Injectable()
export class BookingService {
  constructor(
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,

    @InjectConnection() private readonly connection: Connection,
    private readonly bookingRepo: BookingRepository,

    private readonly apartmentService: ApartmentService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async createBooking(dto: CreateBookingDto, provider: PaymentProvider) {
    const { apartment, checkInDate, checkOutDate } = dto;

    const normalizeDate = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const checkIn = normalizeDate(new Date(checkInDate));
    const checkOut = normalizeDate(new Date(checkOutDate));
    const today = normalizeDate(new Date());

    if (checkIn < today) {
      throw new BadRequestException({
        message: 'Check-in date cannot be in the past',
        success: false,
        status: 400,
      });
    }

    if (checkOut < today) {
      throw new BadRequestException({
        message: 'Check-out date cannot be in the past',
        success: false,
        status: 400,
      });
    }

    if (checkOut < checkIn) {
      throw new BadRequestException({
        message: 'Check-out date must be after check-in date',
        success: false,
        status: 400,
      });
    }

    if (checkIn.getTime() === today.getTime()) {
      throw new BadRequestException({
        message: 'Same-day check-in is not allowed.',
        success: false,
        status: 400,
      });
    }

    const nights =
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24);

    if (nights < 1) {
      throw new BadRequestException({
        message: 'Minimum stay is 1 night',
        success: false,
        status: 400,
      });
    }

    const session = await this.connection.startSession();

    let booking: BookingDocument;
    let apartmentDoc: ApartmentDocument;

    try {
      session.startTransaction();

      apartmentDoc = await this.apartmentService.findApartmentByIdWithSession(
        apartment,
        session,
      );

      const totalUnits = apartmentDoc.totalUnits;

      const dates = this.availabilityService.getDatesInRange(
        checkIn.toISOString(),
        checkOut.toISOString(),
      );

      const overlappingCount =
        await this.availabilityService.ensureAvailabilityForRangeWithSession(
          apartment,
          checkIn.toISOString(),
          checkOut.toISOString(),
          totalUnits,
          session,
        );
      console.log('overlappingCount:', overlappingCount);

      // 3. ATOMICALLY reserve units. This handles the check + decrement in one safe step!
      const unitsRequested = 1; // Change if your DTO supports multiple unit selection per booking
      const reservationData =
        await this.availabilityService.reserveUnitsWithSession(
          new Types.ObjectId(apartment),
          checkIn.toISOString(),
          checkOut.toISOString(),
          unitsRequested,
          session,
        );

      // If the number of modified date documents doesn't match total nights, slots ran out!
      if (
        reservationData.result.modifiedCount !== reservationData.dates.length
      ) {
        throw new BadRequestException({
          message:
            'No available units for selected dates. Someone just booked them.',
          success: false,
          status: 400,
        });
      }

      const data = {
        checkInDate: checkIn,
        checkOutDate: checkOut,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        apartment: new Types.ObjectId(dto.apartment),
        guest: {
          firstName: dto.firstName.trim().toLowerCase(),
          lastName: dto.lastName.trim().toLowerCase(),
          email: dto.email.trim().toLowerCase(),
          phoneNumber: dto.phoneNumber.trim(),
        },
        user: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
      };

      booking = await this.bookingRepo.createBookingWithSession(data, session);

      if (!booking) {
        throw new BadRequestException({
          message: 'Unable to create booking.',
          success: false,
          status: 400,
        });
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    const totalAmount = this.calculateTotalAmount(
      checkIn,
      checkOut,
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

    const response = {
      paymentDetail: paymentIntent,
      bookingDetails: booking,
    };

    return response;
  }

  async getAllMyBookings(
    user: JwtUser,
    userId: string,
    queryWithPaginationDto: QueryWithPaginationDto,
  ) {
    if (user.sub.toString() !== userId) {
      throw new UnauthorizedException({
        message: 'You can only view your bookings.',
        success: false,
        status: 401,
      });
    }

    const bookings = await this.bookingRepo.getAllMyBookings(
      user.sub.toString(),
      queryWithPaginationDto,
    );

    return bookings;
  }
  async getAllBookings(queryWithPaginationDto: QueryWithPaginationDto) {
    const bookings = await this.bookingRepo.getAllBookings(
      queryWithPaginationDto,
    );

    return bookings;
  }

  async getBookingsByEmail(email: string) {
    const bookings = await this.bookingRepo.getBookingsByEmail(email);

    return bookings;
  }

  async getBookingById(bookingId: string, user: JwtUser) {
    const booking = await this.bookingRepo.getBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException({
        message: 'Booking not found.',
        success: false,
        status: 404,
      });
    }

    if (user.role !== Role.ADMIN) {
      if (
        (booking.user && user.sub.toString() !== booking.user?.toString()) ||
        booking.guest.email !== user.email
      ) {
        throw new UnauthorizedException({
          message: 'You can only view your own bookings.',
          success: false,
          status: 401,
        });
      }
    }

    return booking;
  }
  async getBookingByIdWithoutUser(bookingId: string) {
    const booking = await this.bookingRepo.getBookingById(bookingId);

    if (!booking) {
      throw new NotFoundException({
        message: 'Booking not found.',
        success: false,
        status: 404,
      });
    }

    return booking;
  }

  async releaseExpiredHoldsIfAny(
    apartmentId: string,
    checkIn: Date,
    checkOut: Date,
  ) {
    const id = new Types.ObjectId(apartmentId);

    const expiredBookings = await this.bookingRepo.getExpiredBookings(
      id,
      checkIn,
      checkOut,
    );

    if (expiredBookings.length === 0) return;

    // 2. For each expired booking, release its units back and mark it expired
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      for (const booking of expiredBookings) {
        // Mark booking as expired
        booking.status = BookingStatus.expired;
        await booking.save({ session });

        // Get dates for this booking and give units back
        const dates = this.availabilityService.getDatesInRange(
          booking.checkInDate.toISOString(),
          booking.checkOutDate.toISOString(),
        );

        const units = 1;

        await this.availabilityService.releaseReservedAvailability(
          booking.apartment,
          dates,
          units,
          session,
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error('Failed to release expired holds:', error);
    } finally {
      session.endSession();
    }
  }

  async attachUserToGuestBookings(userId: string, email: string) {
    const response = await this.bookingRepo.attachUserToGuestBookings(
      userId,
      email,
    );

    return response;
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
