import { Test, TestingModule } from '@nestjs/testing';
import { HumanResourcesService } from './human-resources.service';

describe('HumanResourcesService', () => {
  let service: HumanResourcesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HumanResourcesService],
    }).compile();

    service = module.get<HumanResourcesService>(HumanResourcesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
