import { Test, TestingModule } from '@nestjs/testing';
import { DocuSealController } from './docu-seal.controller';
import { DocuSealService } from './docu-seal.service';

describe('DocuSealController', () => {
  let controller: DocuSealController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocuSealController],
      providers: [DocuSealService],
    }).compile();

    controller = module.get<DocuSealController>(DocuSealController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
