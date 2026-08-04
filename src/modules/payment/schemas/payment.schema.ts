import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  reference!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  providerReference!: string; // paystack or other provider reference

  @Prop()
  authorizationUrl!: string; // paystack or other provider authorization_url

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.pending })
  status!: PaymentStatus;

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  booking!: Types.ObjectId;

  @Prop({
    type: String,
    enum: PaymentProvider,
    default: PaymentProvider.PAYSTACK,
  })
  provider!: PaymentProvider;

  @Prop({
    default: false,
  })
  verified!: boolean;

  @Prop({ type: Object })
  metadata!: Record<string, any>; // flexible (store raw response if needed)

  @Prop({ default: null })
  paidAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
