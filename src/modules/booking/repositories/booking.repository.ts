import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { QueryWithPaginationDto } from '../../../common/dto/query-with-pagination';
import { BookingStatus } from '../enums/booking-status.enum';
import { Booking, BookingDocument } from '../schemas/booking.schema';

@Injectable()
export class BookingRepository {
  constructor(
    @InjectModel(Booking.name)
    private bookingModel: Model<BookingDocument>,
  ) {}

  async getAllBookings(
    queryWithPaginationDto: QueryWithPaginationDto,
  ): Promise<{
    bookings: BookingDocument[];
    totalPages: number;
    totalCount: number;
  }> {
    const { page, limit, searchParams } = queryWithPaginationDto;

    let query = this.bookingModel.find();

    if (searchParams) {
      const regex = new RegExp(searchParams, 'i');
      query = query.where({
        $or: [
          { 'guest.firstName': { $regex: regex } },
          { 'guest.lastName': { $regex: regex } },
          { 'guest.email': { $regex: regex } },
        ],
      });
    }

    const count = await query.clone().countDocuments();
    let pages = 0;

    if (pages !== undefined && limit !== undefined && count !== 0) {
      const offset = (page - 1) * limit;

      query = query.skip(offset).limit(limit);
      pages = Math.ceil(count / limit);

      if (page > pages) {
        throw new NotFoundException({
          message: 'Page not found.',
          success: false,
          status: 404,
        });
      }
    }

    const bookings = await query.sort({ createdAt: -1 });

    if (!bookings) {
      throw new NotFoundException({
        message: 'Bookings not found.',
        success: false,
        status: 404,
      });
    }

    const response = {
      bookings,
      totalPages: pages,
      totalCount: count,
    };

    return response;
  }

  async getExpiredBookings(
    apartmentId: Types.ObjectId,
    checkIn: Date,
    checkOut: Date,
  ) {
    const response = await this.bookingModel.find({
      apartment: apartmentId,
      status: BookingStatus.pending,
      expiresAt: { $lt: new Date() }, // Expiration time is in the past
      // Ensure they overlap with the dates being checked (optional optimization)
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    });

    return response;
  }

  async getBookingById(bookingId: string): Promise<BookingDocument | null> {
    const id = new Types.ObjectId(bookingId);
    const response = await this.bookingModel.findById(id);

    return response;
  }

  async attachUserToGuestBookings(userId: string, email: string) {
    const id = new Types.ObjectId(userId);

    const response = await this.bookingModel.updateMany(
      {
        email,
        user: { $exists: false },
      },
      {
        $set: { user: id },
      },
    );

    console.log('booking repo attachUserToGuestBookings:', response);

    return response;
  }

  async getAllMyBookings(
    userId: string,
    queryWithPaginationDto: QueryWithPaginationDto,
  ): Promise<{
    bookings: BookingDocument[];
    totalCount: number;
    totalPages: number;
  }> {
    const { page, limit, searchParams } = queryWithPaginationDto;

    const id = new Types.ObjectId(userId);

    let query = this.bookingModel.find({ user: id });

    if (searchParams) {
      const regex = new RegExp(searchParams, 'i');
      query = query.where({
        $or: [
          { firstName: { $regex: regex } },
          { lastName: { $regex: regex } },
          { email: { $regex: regex } },
        ],
      });
    }

    const count = await query.clone().countDocuments();
    let pages = 0;

    if (pages !== undefined && limit !== undefined && count !== 0) {
      const offset = (page - 1) * limit;

      query = query.skip(offset).limit(limit);
      pages = Math.ceil(count / limit);

      if (page > pages) {
        throw new NotFoundException({
          message: 'Page not found.',
          success: false,
          status: 404,
        });
      }
    }

    const bookings = await query.sort({ createdAt: -1 });

    if (!bookings) {
      throw new NotFoundException({
        message: 'Bookings not found.',
        success: false,
        status: 404,
      });
    }

    const response = {
      bookings,
      totalPages: pages,
      totalCount: count,
    };

    return response;
  }
  async countOverlappingBookings(
    apartmentId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<number> {
    const response = await this.bookingModel.countDocuments({
      apartment: apartmentId,
      status: { $in: [BookingStatus.pending, BookingStatus.confirmed] },
      checkInDate: { $lt: checkOutDate },
      checkOutDate: { $gt: checkInDate },
    });

    return response;
  }
  async countOverlappingBookingsWithSession(
    apartmentId: string,
    checkInDate: Date,
    checkOutDate: Date,
    session: ClientSession,
  ): Promise<number> {
    const response = await this.bookingModel
      .countDocuments({
        apartment: apartmentId,
        status: { $in: [BookingStatus.pending, BookingStatus.confirmed] },
        $or: [
          { status: BookingStatus.confirmed },
          { status: BookingStatus.pending, expiresAt: { $gt: new Date() } },
        ],
        checkInDate: { $lt: checkOutDate },
        checkOutDate: { $gt: checkInDate },
      })
      .session(session);

    return response;
  }

  async findBookingByReference(
    reference: string,
  ): Promise<BookingDocument | null> {
    const response = await this.bookingModel.findOne({
      paymentReference: reference,
    });

    return response;
  }

  async createBooking(data: Partial<Booking>): Promise<BookingDocument> {
    const response = await new this.bookingModel(data).save();
    return response;
  }
  async createBookingWithSession(
    data: Partial<Booking>,
    session: ClientSession,
  ): Promise<BookingDocument> {
    const response = await new this.bookingModel(data).save({ session });
    return response;
  }

  async updateBookingByReference(
    reference: string,
    data: Partial<Booking>,
  ): Promise<BookingDocument | null> {
    const response = await this.bookingModel.findOneAndUpdate(
      { paymentReference: reference },
      data,
      { returnDocument: 'after' },
    );

    return response;
  }

  async getBookingsByEmail(email: string): Promise<BookingDocument[]> {
    const response = await this.bookingModel.find({ 'guest.email': email });

    return response;
  }
}
