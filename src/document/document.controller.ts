import { Controller, Get, Param, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DocumentsService } from './document.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  // GET /documents/:id/pdf
  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    try {
      const buffer = await this.docs.fetchPdfBufferById(id);
      if (!buffer) {
        throw new HttpException('PDF not found', HttpStatus.NOT_FOUND);
      }
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${id}.pdf"`,
        'Cache-Control': 'no-store',
      });
      return res.send(buffer);
    } catch (e) {
      throw new HttpException(
        e?.message || 'Error fetching PDF',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
