import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class DocumentsService {
  constructor(private readonly http: HttpService) {}

  // Aquí decides cómo resolver el ID -> URL real del PDF.
  // Ejemplos:
  // - Si "id" es el itemId de Monday, llama a MondayService para obtener el asset.
  // - Si "id" es directamente un assetId/URL, resuélvelo y bájalo.
  async fetchPdfBufferById(id: string): Promise<Buffer | null> {
    // DEMO: sustituye esto por tu lógica real
    // const { fileUrl } = await this.mondayService.getFileUrlFromItem(id);
    const fileUrl = process.env.DEMO_PDF_URL; // solo para probar

    if (!fileUrl) return null;

    const resp = await this.http.axiosRef.get(fileUrl, {
      responseType: 'arraybuffer',
      headers: fileUrl.includes('monday.com/protected_static')
        ? { Authorization: process.env.MONDAY_TOKEN! }
        : {},
    });

    return Buffer.from(resp.data);
  }
}
