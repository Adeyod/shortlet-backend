import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { NotificationListener } from './listeners/notification.listener';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [BookingModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationListener],
})
export class NotificationModule {}
