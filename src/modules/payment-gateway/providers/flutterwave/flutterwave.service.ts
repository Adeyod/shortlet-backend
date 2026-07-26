import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  IPaymentProvider,
  PaymentInitializationPayload,
  PaymentProviderResponse,
} from '../../../payment/interfaces/provider.interface';

@Injectable()
export class FlutterwaveService implements IPaymentProvider {
  private readonly baseUrl = 'https://api.flutterwave.com/v3';
  private readonly secretKey = process.env.FLUTTERWAVE_TEST_SECRET_KEY;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>(
      'FLUTTERWAVE_TEST_SECRET_KEY',
    );
  }

  async initializePayment(
    payload: PaymentInitializationPayload,
  ): Promise<PaymentProviderResponse> {
    const { email, amount, reference } = payload;

    const response = await axios.post(
      `${this.baseUrl}/payments`,
      {
        tx_ref: reference,
        amount: amount, // Flutterwave expects amount in NGN (not kobo)
        currency: 'NGN',
        redirect_url: 'https://your-frontend.com/payment/callback',
        customer: {
          email,
        },
        customizations: {
          title: 'Apartment Booking Payment',
        },
        meta: payload, // attach metadata
      },
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      provider: 'flutterwave',
      reference,
      providerReference: response.data.data.id, // Flutterwave transaction ID
      paymentUrl: response.data.data.link,
    };
  }

  async verifyPayment(reference: string): Promise<any> {
    // ⚠️ Flutterwave uses transaction ID for verification
    // So this reference should be providerReference (tx_id)

    const response = await axios.get(
      `${this.baseUrl}/transactions/${reference}/verify`,
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      },
    );

    return response.data.data;
  }
}
