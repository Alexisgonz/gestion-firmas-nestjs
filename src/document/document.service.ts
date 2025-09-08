import { Injectable, Logger } from '@nestjs/common';
import { MondayService } from '../monday/monday.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  constructor(private readonly monday: MondayService) {}

  async fetchPdfBufferById(itemId: string): Promise<Buffer | null> {
    // Atajo para pruebas locales
    if (itemId === 'demo') {
      const { readFile } = await import('fs/promises');
      const { join } = await import('path');
      return readFile(join(process.cwd(), 'test', 'dummy.pdf')).catch(() => null);
    }

    const meta = await this.monday.getItemMeta(itemId);
    if (!meta) {
      this.logger.warn(`Item ${itemId} no encontrado`);
      return null;
    }
    if (!meta.fileUrl) {
      this.logger.warn(`Item ${itemId} sin fileUrl`);
      return null;
    }

    try {
      return await this.monday.downloadFile(meta.fileUrl);
    } catch (e: any) {
      this.logger.error(`Error bajando PDF: ${e?.message}`);
      return null;
    }
  }
}
