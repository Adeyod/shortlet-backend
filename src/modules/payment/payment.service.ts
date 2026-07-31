import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { PaymentProvider } from './enums/payment-provider.enum';
import { WebhookProcessionTransactionType } from './enums/payment-transaction.enum';
import { PaymentRepository } from './repositories/payment.repository';

@Injectable()
export class PaymentService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly paymentRepository: PaymentRepository,
    private readonly gatewayService: PaymentGatewayService,
  ) {}
  async createPaymentIntent(
    provider: PaymentProvider,
    data: {
      bookingId: Types.ObjectId;
      email: string;
      amount: number;
      userId?: Types.ObjectId;
    },
  ) {
    const createIntent = await this.paymentRepository.createPaymentIntent(
      provider,
      data,
    );

    if (!createIntent) {
      throw new BadRequestException({
        message: 'Unable to create payment document',
        success: false,
        status: 400,
      });
    }

    const providerResponse = await this.gatewayService.initializePayment(
      provider,
      {
        email: data.email,
        amount: data.amount,
        reference: createIntent.reference,
        userId: data.userId
          ? data.userId.toString()
          : data.bookingId.toString(),
        bookingId: data.bookingId.toString(),
        type: WebhookProcessionTransactionType.booking_payment,
      },
    );

    const updateIntent = await this.paymentRepository.updateIntentWithAuthUrl(
      createIntent._id,
      providerResponse.paymentUrl,
      providerResponse.providerReference,
    );
    return providerResponse;
  }

  async verifyPayment(provider: PaymentProvider, reference: string) {
    const findPaymentDoc =
      await this.paymentRepository.getPaymentDocByReference(reference.trim());

    if (!findPaymentDoc) {
      throw new NotFoundException({
        message: 'Payment not found.',
        success: false,
        status: 404,
      });
    }
    const gatewayResponse = await this.gatewayService.verifyPayment(
      provider,
      findPaymentDoc.providerReference,
    );

    if (!gatewayResponse || gatewayResponse.status !== 'success') {
      return {
        message: 'Payment not successful yet.',
        success: false,
        status: 400,
      };
    }
  }
}
