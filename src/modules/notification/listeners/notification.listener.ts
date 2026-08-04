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
    userEmail: string;
  }) {
    const { userId, userEmail } = payload;

    if (!userId || !userEmail) {
      return;
    }

    const email = userEmail;

    const response = await this.bookingService.attachUserToGuestBookings(
      userId,
      email,
    );
  }
}
