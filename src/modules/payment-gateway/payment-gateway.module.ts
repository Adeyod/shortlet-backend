import { forwardRef, Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { PaymentGatewayController } from './payment-gateway.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { FlutterwaveService } from './providers/flutterwave/flutterwave.service';
import { PaystackService } from './providers/paystack/paystack.service';

@Module({
  imports: [forwardRef(() => PaymentModule)],
  controllers: [PaymentGatewayController],
  providers: [PaymentGatewayService, PaystackService, FlutterwaveService],
  exports: [PaymentGatewayService],
})
export class PaymentGatewayModule {}
