import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  IPaymentProvider,
  PaymentInitializationPayload,
} from '../../../payment/interfaces/provider.interface';

@Injectable()
export class PaystackService implements IPaymentProvider {
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secret = process.env.PAYSTACK_TEST_SECRET_KEY;
  constructor(private configService: ConfigService) {
    this.secret = this.configService.get<string>('PAYSTACK_TEST_SECRET_KEY');
  }

  async initializePayment(payload: PaymentInitializationPayload) {
    const { amount, userId, email, ref } = payload;

    const dataToSend = {
      email: email,
      amount,
      ref,
      metadata: payload,
    };
    const response = await axios.post(
      `${this.baseUrl}/transaction/initialize`,
      dataToSend,
      {
        headers: {
          Authorization: `Bearer ${this.secret}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('response:', response);

    return {
      provider: 'paystack',
      reference: payload.ref,
      // reference: payload.reference,
      providerReference: response.data.data.reference,
      paymentUrl: response.data.data.authorization_url,
    };
  }

  async verifyPayment(reference: string): Promise<any> {
    const response = await axios.get(
      `${this.baseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.secret as string}`,
        },
      },
    );

    return response.data.data;
  }

  // handleWebhook(req: Request): Promise<any> {
  //   const hash = crypto
  //     .createHmac('sha512', this.secret as string)
  //     .update(JSON.stringify(req.body))
  //     .digest('hex');

  //   if (hash !== req.headers['x-paystack-signature']) {
  //     throw new UnauthorizedException({
  //       message: 'Invalid signature.',
  //       success: false,
  //       status: 401,
  //     });
  //   }

  //   const event = req.body;
  //   return event;
  // }
}
