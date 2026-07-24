import { Test, TestingModule } from '@nestjs/testing';
import { ApartmentUnitService } from './apartment-unit.service';

describe('ApartmentUnitService', () => {
  let service: ApartmentUnitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApartmentUnitService],
    }).compile();

    service = module.get<ApartmentUnitService>(ApartmentUnitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
