import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MediaType } from '../../../common/infrastructure/enums/file-type.enum';

export type ApartmentDocument = HydratedDocument<Apartment>;

@Schema({ timestamps: true })
export class Apartment {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  pricePerNight!: number;

  @Prop({ required: true, min: 1 })
  totalUnits!: number;

  @Prop({ required: true, min: 1 })
  bedrooms!: number;

  @Prop({ required: true, min: 1 })
  bathrooms!: number;

  @Prop({ required: true, min: 1 })
  guests!: number;

  @Prop({ type: [String], default: [] })
  amenities!: string[];

  @Prop({
    type: {
      address: String,
      city: String,
      state: String,
      country: String,
      latitude: Number,
      longitude: Number,
    },
    required: true,
  })
  location!: {
    address: string;
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };

  // Product images (Cloudinary / S3 URLs)
  @Prop({
    type: [
      {
        type: { type: String, enum: Object.values(MediaType) },
        url: String,
        publicUrl: String,
      },
    ],
    default: [],
  })
  media!: {
    type: MediaType;
    url: string;
    publicUrl: string;
  }[];

  // Controls visibility & booking
  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;

  // Featured listing (for homepage / promotions)
  @Prop({ default: false })
  isFeatured!: boolean;

  // Recently added (optional UI badge)
  @Prop({ default: true })
  isNew!: boolean;
}

export const ApartmentSchema = SchemaFactory.createForClass(Apartment);

// Optional indexes
ApartmentSchema.index({ name: 'text', description: 'text' });
