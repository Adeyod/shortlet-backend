import { Controller, Param, Post, Req } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';

@Controller('payment-gateway')
export class PaymentGatewayController {
  constructor(private readonly gatewayService: PaymentGatewayService) {}
  @Post('webhook/:provider')
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: Request,
  ) {
    const service = this.gatewayService.getProvider(provider);

    if (!service.handleWebhook) {
      throw new Error(`${provider} does not support webhook`);
    }

    return await service.handleWebhook(req);
  }
}
