import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Booking, BookingDocument } from '../schemas/booking.schema';

@Injectable()
export class BookingRepository {
  constructor(
    @InjectModel(Booking.name)
    private bookingModel: Model<BookingDocument>,
  ) {}

  async countOverlappingBookings(
    apartmentId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<number> {
    const response = await this.bookingModel.countDocuments({
      apartment: apartmentId,
      status: { $in: ['pending', 'confirmed'] },
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
        status: { $in: ['pending', 'confirmed'] },
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
}
