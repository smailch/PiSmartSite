import { Test, TestingModule } from '@nestjs/testing';
import { HumanResourcesController } from './human-resources.controller';

describe('HumanResourcesController', () => {
  let controller: HumanResourcesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HumanResourcesController],
    }).compile();

    controller = module.get<HumanResourcesController>(HumanResourcesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
