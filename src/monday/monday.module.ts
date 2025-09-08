import { forwardRef, Module } from '@nestjs/common';
import { MondayService } from './monday.service';
import { MondayController } from './monday.controller';
import { HttpModule } from '@nestjs/axios';
import { DocusealModule } from 'src/docu-seal/docu-seal.module';

@Module({
  imports: [HttpModule, forwardRef(() => DocusealModule)],
  controllers: [MondayController],
  providers: [MondayService],
  exports: [MondayService],
})
export class MondayModule {}
