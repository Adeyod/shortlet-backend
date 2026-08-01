import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PaymentProvider } from '../payment/enums/payment-provider.enum';
import { PaymentInitializationPayload } from '../payment/interfaces/provider.interface';
import { PaymentService } from '../payment/payment.service';
import { FlutterwaveService } from './providers/flutterwave/flutterwave.service';
import { PaystackService } from './providers/paystack/paystack.service';

@Injectable()
export class PaymentGatewayService {
  private providers: Record<string, any>;

  constructor(
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
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

  async handleWebhook(provider: PaymentProvider, req: any) {
    const service = this.getProvider(provider);

    if (!service.handleWebhook) {
      throw new Error(`${provider} does not support webhook`);
    }

    const webhookData = await service.handleWebhook(req);

    console.log(`${provider} webhookData:`, webhookData);

    if (
      webhookData.status === 'success' ||
      webhookData.event === 'charge.success'
    ) {
      const reference = webhookData.data.reference;
      console.log(`${provider} reference:`, reference);

      // 3. Call your PaymentService to update booking & payment records idempotently
      const res = await this.paymentService.fulfillSuccessfulPayment(
        provider,
        reference,
      );
      console.log(`${provider} fulfillSuccessfulPayment:`, res);
    }

    return { received: true };
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
