import {
  Controller,
  Post,
  Body,
  // Get,
  // Param,
  // Patch,
  // Delete,
} from '@nestjs/common';
import { MondayService } from './monday.service';

@Controller('monday')
export class MondayController {
  constructor(private readonly mondayService: MondayService) {}

  @Post()
  // create(@Body() createMondayDto: CreateMondayDto) {
  //   return this.mondayService.create(createMondayDto);
  // }

  // @Get()
  // findAll() {
  //   // return this.mondayService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.mondayService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateMondayDto: UpdateMondayDto) {
  //   return this.mondayService.update(+id, updateMondayDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.mondayService.remove(+id);
  // }
  @Post('webhook')
  async handleWebhook(@Body() payload: any) {
    console.log('📩 Webhook recibido de Monday:', payload);
    await this.mondayService.handleWebhook(payload);
    return { status: 'success' };
  }
}
