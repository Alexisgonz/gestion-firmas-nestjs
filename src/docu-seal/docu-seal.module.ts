import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DocusealService } from './docu-seal.service';
import { DocusealController } from './docu-seal.controller';
import { MondayModule } from '../monday/monday.module';

@Module({
  imports: [HttpModule, forwardRef(() => MondayModule)],
  controllers: [DocusealController],
  providers: [DocusealService],
  exports: [DocusealService],
})
export class DocusealModule {}
