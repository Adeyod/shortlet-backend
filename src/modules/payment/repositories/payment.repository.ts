import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QueryWithPaginationDto } from '../../../common/dto/query-with-pagination';
import { generatePaymentReference } from '../../../common/utils/helper';
import { CreatePaymentIntentDto } from '../dtos/payment-intent.dto';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { Payment, PaymentDocument } from '../schemas/payment.schema';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
  ) {}

  async getPaymentDocByReference(
    reference: string,
  ): Promise<PaymentDocument | null> {
    const response = await this.paymentModel.findOne({
      providerReference: reference,
    });

    return response;
  }

  async createPaymentIntent(
    provider: PaymentProvider,
    dto: CreatePaymentIntentDto,
  ) {
    const payload = {
      bookingId: dto.bookingId,
    };
    const reference = generatePaymentReference(payload, 'PAYMENT');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const data = {
      amount: dto.amount,
      email: dto.email,
      booking: dto.bookingId,
      reference,
      provider,
      expiresAt,
      userId: dto.userId,
    };
    const newPayment = await new this.paymentModel(data).save();

    return newPayment;
  }

  async updateIntentWithAuthUrl(
    id: Types.ObjectId,
    authorizationUrl: string,
    providerReference: string,
  ): Promise<PaymentDocument | null> {
    console.log('providerReference:', providerReference);
    const update = await this.paymentModel.findByIdAndUpdate(
      id,
      {
        authorizationUrl: authorizationUrl,
        providerReference: providerReference,
      },
      { returnDocument: 'after' },
    );

    return update;
  }

  async attachUserToPayments(userId: string, bookingIds: Types.ObjectId[]) {
    const userObjectId = new Types.ObjectId(userId);

    const paymentResponse = await this.paymentModel.updateMany(
      {
        booking: { $in: bookingIds },
        $or: [{ user: { $exists: false } }, { user: null }],
      },
      {
        $set: { user: userObjectId },
      },
    );

    return paymentResponse;
  }

  async getPaymentById(paymentId: string): Promise<PaymentDocument | null> {
    const id = new Types.ObjectId(paymentId);

    const response = await this.paymentModel.findById(id);

    return response;
  }

  async getAllPayments(
    queryWithPaginationDto: QueryWithPaginationDto,
  ): Promise<{
    payments: PaymentDocument[];
    totalPages: number;
    totalCount: number;
  }> {
    const { page, limit, searchParams } = queryWithPaginationDto;

    let query = this.paymentModel.find();

    if (searchParams) {
      const regex = new RegExp(searchParams, 'i');

      query = query.where({
        $or: [{ email: { $regex: regex } }],
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

    const payments = await query.sort({ createdAt: -1 });

    if (!payments) {
      throw new NotFoundException({
        message: 'Payments not found.',
        success: false,
        status: 404,
      });
    }

    const response = {
      payments,
      totalPages: pages,
      totalCount: count,
    };

    return response;
  }

  async getAllMyPayments(
    userId: string,
    queryWithPaginationDto: QueryWithPaginationDto,
  ): Promise<{
    payments: PaymentDocument[];
    totalCount: number;
    totalPages: number;
  }> {
    const { page, limit, searchParams } = queryWithPaginationDto;

    const id = new Types.ObjectId(userId);

    let query = this.paymentModel.find({ user: id, isDeleted: false });

    if (searchParams) {
      const regex = new RegExp(searchParams, 'i');
      query = query.where({
        $or: [{ email: { $regex: regex } }],
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

    const payments = await query.sort({ createdAt: -1 });

    if (!payments) {
      throw new NotFoundException({
        message: 'Payments not found.',
        success: false,
        status: 404,
      });
    }

    const response = {
      payments,
      totalPages: pages,
      totalCount: count,
    };

    return response;
  }
}
