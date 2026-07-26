import { Injectable } from '@nestjs/common';
import { PaymentInitializationPayload } from '../payment/interfaces/provider.interface';
import { FlutterwaveService } from './providers/flutterwave/flutterwave.service';
import { PaystackService } from './providers/paystack/paystack.service';

@Injectable()
export class PaymentGatewayService {
  private providers: Record<string, any>;

  constructor(
    private readonly paystackService: PaystackService,
    private readonly flutterwaveService: FlutterwaveService,
  ) {
    this.providers = {
      paystack: this.paystackService,
      flutterwave: this.flutterwaveService,
    };
  }

  // private getProvider(provider: string): IPaymentProvider {
  //   switch (provider) {
  //     case 'paystack':
  //       return this.paystackService;

  //     case 'flutterwave':
  //       return this.flutterwaveService;

  //     default:
  //       throw new Error('Unsupported payment provider');
  //   }
  // }

  getProvider(provider: string) {
    const service = this.providers[provider];

    if (!service) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return service;
  }

  async initializePayment(
    provider: string,
    payload: PaymentInitializationPayload,
  ) {
    const handler = this.getProvider(provider);
    return await handler.initializePayment(payload);
  }

  async verifyPayment(provider: string, reference: string) {
    const handler = this.getProvider(provider);
    return await handler.verifyPayment(reference);
  }
}
