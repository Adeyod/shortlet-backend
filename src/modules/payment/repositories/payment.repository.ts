import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
}
