import { Test, TestingModule } from '@nestjs/testing';
import { ApartmentUnitController } from './apartment-unit.controller';

describe('ApartmentUnitController', () => {
  let controller: ApartmentUnitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApartmentUnitController],
    }).compile();

    controller = module.get<ApartmentUnitController>(ApartmentUnitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
