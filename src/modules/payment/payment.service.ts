import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { QueryWithPaginationDto } from '../../common/dto/query-with-pagination';
import { JwtUser } from '../../common/types/jwt-user.type';
import { BookingService } from '../booking/booking.service';
import { BookingStatus } from '../booking/enums/booking-status.enum';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { Role } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { PaymentProvider } from './enums/payment-provider.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { WebhookProcessionTransactionType } from './enums/payment-transaction.enum';
import { PaymentRepository } from './repositories/payment.repository';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
    @Inject(forwardRef(() => PaymentGatewayService))
    private readonly gatewayService: PaymentGatewayService,

    private readonly userService: UsersService,

    @InjectConnection() private readonly connection: Connection,
    private readonly paymentRepository: PaymentRepository,
  ) {}
  async createPaymentIntent(
    provider: PaymentProvider,
    data: {
      bookingId: Types.ObjectId;
      email: string;
      amount: number;
      userId?: Types.ObjectId;
    },
  ) {
    const createIntent = await this.paymentRepository.createPaymentIntent(
      provider,
      data,
    );

    if (!createIntent) {
      throw new BadRequestException({
        message: 'Unable to create payment document',
        success: false,
        status: 400,
      });
    }

    const providerResponse = await this.gatewayService.initializePayment(
      provider,
      {
        email: data.email,
        amount: data.amount * 100,
        ref: createIntent.reference,
        userId: data.userId
          ? data.userId.toString()
          : data.bookingId.toString(),
        bookingId: data.bookingId.toString(),
        type: WebhookProcessionTransactionType.booking_payment,
      },
    );

    const updateIntent = await this.paymentRepository.updateIntentWithAuthUrl(
      createIntent._id,
      providerResponse.paymentUrl,
      providerResponse.providerReference,
    );

    // console.log('service providerResponse:', providerResponse);
    return providerResponse;
  }

  async verifyPayment(provider: PaymentProvider, reference: string) {
    const response = await this.fulfillSuccessfulPayment(provider, reference);

    return response;
  }

  async fulfillSuccessfulPayment(provider: PaymentProvider, reference: string) {
    const findPaymentDoc =
      await this.paymentRepository.getPaymentDocByReference(reference);

    if (!findPaymentDoc) {
      throw new NotFoundException({
        message: 'Payment not found.',
        success: false,
        status: 404,
      });
    }

    // 1. Verify with Paystack via the Gateway
    const verificationData = await this.gatewayService.verifyPayment(
      provider,
      findPaymentDoc.providerReference,
    );

    if (verificationData.status !== 'success') {
      throw new BadRequestException({
        message: 'Payment was not successful',
        success: false,
        status: 400,
      });
    }

    const bookingId = verificationData.metadata.bookingId; // Or extracted from reference/metadata

    // 2. Find the booking
    const booking = await this.bookingService.getBookingByIdWithoutUser(
      findPaymentDoc.booking.toString(),
    );
    if (!booking) {
      throw new NotFoundException({
        message: 'Booking not found',
        success: false,
        status: 404,
      });
    }

    const user = await this.userService.findByEmail(booking.guest.email);

    // Idempotency check: If already confirmed, just return success safely
    if (
      booking.status === BookingStatus.confirmed &&
      findPaymentDoc.status === PaymentStatus.success
    ) {
      return {
        success: true,
        message: 'Payment already processed',
        isRegistered: !!user,
      };
    }

    // 3. Update booking status to CONFIRMED
    booking.status = BookingStatus.confirmed;
    findPaymentDoc.status = PaymentStatus.success;
    findPaymentDoc.verified = true;
    await booking.save();
    await findPaymentDoc.save();

    return { success: true, booking, isRegistered: !!user };
  }

  async getAllPayments(queryWithPaginationDto: QueryWithPaginationDto) {
    const payments = await this.paymentRepository.getAllPayments(
      queryWithPaginationDto,
    );

    return payments;
  }

  async getAllMyPayments(
    user: JwtUser,
    userId: string,
    queryWithPaginationDto: QueryWithPaginationDto,
  ) {
    if (user.sub.toString() !== userId) {
      throw new UnauthorizedException({
        message: 'You can only view your payments.',
        success: false,
        status: 401,
      });
    }

    const bookings = await this.paymentRepository.getAllMyPayments(
      user.sub.toString(),
      queryWithPaginationDto,
    );

    return bookings;
  }

  async getPaymentById(paymentId: string, user: JwtUser) {
    const response = await this.paymentRepository.getPaymentById(paymentId);

    if (!response) {
      throw new NotFoundException({
        message: 'Payment not found.',
        success: false,
        status: 404,
      });
    }

    if (user.role !== Role.ADMIN) {
      if (response.isDeleted === true) {
        throw new NotFoundException({
          message: 'Payment not found.',
          success: false,
          status: 404,
        });
      }

      if (!response.user) {
        throw new UnauthorizedException({
          message: 'You can only view your own payments.',
          success: false,
          status: 401,
        });
      }

      if (response.user?.toString() !== user.sub.toString()) {
        throw new UnauthorizedException({
          message: 'You can only view your own payments.',
          success: false,
          status: 401,
        });
      }
    }

    return response;
  }
  async deletePaymentById(paymentId: string, user: JwtUser) {
    const response = await this.paymentRepository.getPaymentById(paymentId);

    if (!response) {
      throw new NotFoundException({
        message: 'Payment not found.',
        success: false,
        status: 404,
      });
    }

    if (!response.user) {
      throw new UnauthorizedException({
        message: 'You can only delete your own payments.',
        success: false,
        status: 401,
      });
    }

    if (response.user?.toString() !== user.sub.toString()) {
      throw new UnauthorizedException({
        message: 'You can only delete your own payments.',
        success: false,
        status: 401,
      });
    }

    response.isDeleted = true;
    await response.save();

    return response;
  }

  async attachUserToPayments(userId: string, bookingIds: Types.ObjectId[]) {
    const response = await this.paymentRepository.attachUserToPayments(
      userId,
      bookingIds,
    );

    return response;
  }
}
