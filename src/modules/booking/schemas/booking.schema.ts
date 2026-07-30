import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BookingStatus } from '../enums/booking-status.enum';
import { GuestInfo } from './guest-info.schema';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ timestamps: true })
export class Booking {
  @Prop({
    type: Types.ObjectId,
    ref: 'Apartment',
    required: true,
  })
  apartment!: Types.ObjectId;

  @Prop({ required: true })
  checkInDate!: Date;

  @Prop({ required: true })
  checkOutDate!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId;

  @Prop({ type: GuestInfo, required: true })
  guest!: GuestInfo;

  @Prop({ default: BookingStatus.pending })
  status!: BookingStatus;

  @Prop()
  expiresAt!: Date;

  @Prop()
  paymentReference?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
