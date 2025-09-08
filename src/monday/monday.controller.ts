import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import { MondayService } from './monday.service';

@Controller('monday')
export class MondayController {
  constructor(private readonly mondayService: MondayService) {}

  @Post()
  async handleWebhook(@Body() payload: any) {
    // Aquí puedes procesar el payload del webhook según tus necesidades
    console.log('Webhook recibido:', JSON.stringify(payload, null, 2));
    // Por ejemplo, podrías verificar el tipo de evento y actuar en consecuencia
    return { status: 'ok' };
  }
}

