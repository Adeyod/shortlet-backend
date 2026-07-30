import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AvailabilityDocument = HydratedDocument<Availability>;

@Schema({ timestamps: true })
export class Availability {
  @Prop({ type: Types.ObjectId, ref: 'Apartment', required: true })
  apartmentId!: Types.ObjectId;

  @Prop({ required: true })
  date!: Date; // Stored as normalized UTC midnight (00:00:00.000Z)

  @Prop({ required: true, min: 0 })
  availableUnits!: number;

  @Prop({ required: true, default: 0 })
  bookedUnits!: number;

  @Prop({ required: true, default: 0 })
  adminBlockedUnits!: number;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

AvailabilitySchema.index({ apartmentId: 1, date: 1 }, { unique: true });
