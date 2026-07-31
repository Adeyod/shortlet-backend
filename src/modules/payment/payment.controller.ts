import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { PaymentProvider } from './enums/payment-provider.enum';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('verify-payment/:provider/:reference')
  @SuccessMessage('Payment processed successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify payment status',
    description:
      'Frontend calls this endpoint to confirm if a payment was successful using the payment reference.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment processed successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async verifyPayment(
    @Param('provider') provider: PaymentProvider,
    @Param('reference') reference: string,
  ) {
    return await this.paymentService.verifyPayment(provider, reference);
  }
}
