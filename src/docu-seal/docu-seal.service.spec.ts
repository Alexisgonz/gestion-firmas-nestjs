import { Test, TestingModule } from '@nestjs/testing';
import { DocuSealService } from './docu-seal.service';

describe('DocuSealService', () => {
  let service: DocuSealService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocuSealService],
    }).compile();

    service = module.get<DocuSealService>(DocuSealService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
