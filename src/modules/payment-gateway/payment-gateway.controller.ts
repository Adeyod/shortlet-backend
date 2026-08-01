import { Controller, Param, Post, Req } from '@nestjs/common';
import { PaymentProvider } from '../payment/enums/payment-provider.enum';
import { PaymentGatewayService } from './payment-gateway.service';

@Controller('payment-gateway')
export class PaymentGatewayController {
  constructor(private readonly gatewayService: PaymentGatewayService) {}
  @Post('webhook/:provider')
  async handleWebhook(
    @Param('provider') provider: PaymentProvider,
    @Req() req: Request,
  ) {
    const response = await this.gatewayService.handleWebhook(provider, req);

    return response;
  }
}
