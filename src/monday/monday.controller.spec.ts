import { Test, TestingModule } from '@nestjs/testing';
import { MondayController } from './monday.controller';
import { MondayService } from './monday.service';

describe('MondayController', () => {
  let controller: MondayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MondayController],
      providers: [MondayService],
    }).compile();

    controller = module.get<MondayController>(MondayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
