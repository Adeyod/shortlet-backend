import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RegistrationEvents } from '../../../common/events/registration.events';
import { BookingService } from '../../booking/booking.service';

@Injectable()
export class NotificationListener {
  constructor(private readonly bookingService: BookingService) {}

  @OnEvent(RegistrationEvents.email_verified)
  async handleBookingUserIdReconciliation(payload: {
    userId: string;
    email: string;
  }) {
    const { userId, email } = payload;

    if (!userId || !email) return;

    const response = await this.bookingService.attachUserToGuestBookings(
      userId,
      email,
    );

    console.log('response:', response);
  }
}
