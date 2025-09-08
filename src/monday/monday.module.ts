import { Module } from '@nestjs/common';
import { MondayService } from './monday.service';
import { MondayController } from './monday.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [MondayController],
  providers: [MondayService],
  exports: [MondayService],
})
export class MondayModule {}
