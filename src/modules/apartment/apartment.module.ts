import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from '../../common/infrastructure/cloudinary/cloudinary.module';
import { ApartmentController } from './apartment.controller';
import { ApartmentService } from './apartment.service';
import { ApartmentRepository } from './repositories/apartment.repository';
import { Apartment, ApartmentSchema } from './schemas/apartment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Apartment.name, schema: ApartmentSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [ApartmentController],
  providers: [ApartmentService, ApartmentRepository],
  exports: [ApartmentRepository],
})
export class ApartmentModule {}
