import { Module } from '@nestjs/common';
import { PaymentGatewayController } from './payment-gateway.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { FlutterwaveService } from './providers/flutterwave/flutterwave.service';
import { PaystackService } from './providers/paystack/paystack.service';

@Module({
  controllers: [PaymentGatewayController],
  providers: [PaymentGatewayService, PaystackService, FlutterwaveService],
  exports: [PaymentGatewayService],
})
export class PaymentGatewayModule {}
