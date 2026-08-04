import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetCurrentUser } from '../../common/decorators/get-current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { QueryWithPaginationDto } from '../../common/dto/query-with-pagination';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { Role } from '../users/schemas/user.schema';
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

  @Get('all-payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Payments fetched successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'This is the endpoint for fetching all the payments on the application.',
    description:
      'Admin will be using this endpoint to get all the payment on the application for administrative purpose.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments fetched successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Unable to fetched Payments.',
  })
  @ApiResponse({
    status: 404,
    description: 'Payments not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async getAllPayments(@Query() dto: QueryWithPaginationDto) {
    const response = await this.paymentService.getAllPayments(dto);

    return response;
  }

  @Get('my-payments/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Payments fetched successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'This is the endpoint for fetching all the Payments of the logged in user.',
    description:
      'This endpoint will be used to get all the Payment of the logged in user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments fetched successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Unable to fetched Payments.',
  })
  @ApiResponse({
    status: 404,
    description: 'Payments not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async getAllMyPayments(
    @GetCurrentUser() user: JwtUser,
    @Param('userId') userId: string,
    @Query() dto: QueryWithPaginationDto,
  ) {
    const response = await this.paymentService.getAllMyPayments(
      user,
      userId,
      dto,
    );

    return response;
  }

  @Get('get-payment-by-id/:paymentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @SuccessMessage('Payment fetched successfully.')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'This is the endpoint for fetching Payment by ID.',
    description:
      'This endpoint is for fetching Payment details from the database. It can be used by Admin and the user that own the Payment.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment fetched successfully.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Unable to fetched Payment.',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  async getPaymentById(
    @Param('bookingId') paymentId: string,
    @GetCurrentUser() user: JwtUser,
  ) {
    const response = await this.paymentService.getPaymentById(paymentId, user);

    return response;
  }
}
