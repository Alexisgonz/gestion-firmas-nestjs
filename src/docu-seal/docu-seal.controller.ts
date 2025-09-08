// docuseal.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { MondayService } from '../monday/monday.service';
import { DocusealService } from './docu-seal.service';

@Controller('docuseal')
export class DocusealController {
  constructor(
    private readonly docuseal: DocusealService,
    @Inject(forwardRef(() => MondayService))
    private readonly monday: MondayService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() payload: any) {
    const event = payload?.event || payload?.status;
    const submissionId = payload?.id || payload?.submission_id;
    const itemId = payload?.metadata?.itemId || payload?.metadata?.item_id;

    if (event === 'completed' && submissionId && itemId) {
      // 1) Descarga el PDF firmado desde DocuSeal
      const signedPdf = await this.docuseal.downloadSignedPdf(
        String(submissionId),
      );

      // 2) Adjunta PDF firmado en Monday
      await this.monday.attachSignedPdf(Number(itemId), signedPdf);

      // 3) Opcional: cambia la columna de estado "Estado Firmas" a "Firmado"
      await this.monday.updateStatus(
        Number(itemId),
        'dup__of_estado_rq4',
        'Firmado',
      );
    }

    return { ok: true };
  }
}
