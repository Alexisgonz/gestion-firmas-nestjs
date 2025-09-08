import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';
import { DocumentsController } from './document.controller';
import { DocumentsService } from './document.service';

@Module({
  imports: [HttpModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentModule {}
