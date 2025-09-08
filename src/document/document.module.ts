import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DocumentsController } from './document.controller';
import { DocumentsService } from './document.service';
import { MondayModule } from '../monday/monday.module';

@Module({
  imports: [
    HttpModule,
    MondayModule
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentModule {}
