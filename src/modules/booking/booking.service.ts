import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { QueryWithPaginationDto } from '../../common/dto/query-with-pagination';
import { JwtUser } from '../../common/types/jwt-user.type';
import { ApartmentService } from '../apartment/apartment.service';
import { PaymentProvider } from '../payment/enums/payment-provider.enum';
import { PaymentService } from '../payment/payment.service';
import { Role } from '../users/schemas/user.schema';
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

    try {
      session.startTransaction();

      const apartmentDoc =
        await this.apartmentService.findApartmentByIdWithSession(
          apartment,
          session,
        );

      const totalUnits = apartmentDoc.totalUnits;

      const overlappingCount =
        await this.bookingRepo.countOverlappingBookingsWithSession(
          apartment,
          checkIn,
          checkOut,
          session,
        );
      console.log('overlappingCount:', overlappingCount);

      if (overlappingCount >= totalUnits) {
        throw new BadRequestException({
          message: 'No available units for selected dates',
          success: false,
          status: 400,
        });
      }

      const data = {
        checkInDate: checkIn,
        checkOutDate: checkOut,
        apartment: new Types.ObjectId(dto.apartment),
        guest: {
          firstName: dto.firstName.trim().toLowerCase(),
          lastName: dto.lastName.trim().toLowerCase(),
          email: dto.email.trim().toLowerCase(),
          phoneNumber: dto.phoneNumber.trim(),
        },
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

      await session.commitTransaction();

      const response = {
        paymentDetail: paymentIntent,
        bookingDetails: booking,
      };

      return response;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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
