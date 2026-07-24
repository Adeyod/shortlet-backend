import { Module } from '@nestjs/common';
import { ApartmentUnitController } from './apartment-unit.controller';
import { ApartmentUnitService } from './apartment-unit.service';

@Module({
  controllers: [ApartmentUnitController],
  providers: [ApartmentUnitService]
})
export class ApartmentUnitModule {}
