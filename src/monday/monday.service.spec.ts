import { Test, TestingModule } from '@nestjs/testing';
import { MondayService } from './monday.service';

describe('MondayService', () => {
  let service: MondayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MondayService],
    }).compile();

    service = module.get<MondayService>(MondayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
