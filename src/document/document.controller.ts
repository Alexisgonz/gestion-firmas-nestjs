import { Controller, Get, Param, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DocumentsService } from './document.service';
import { MondayService } from '../monday/monday.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly docs: DocumentsService,
    private readonly monday: MondayService,
  ) {}

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.docs.fetchPdfBufferById(id);
    if (!buffer) {
      throw new HttpException('PDF not found or upstream error', HttpStatus.NOT_FOUND);
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${id}.pdf"`,
      'Cache-Control': 'no-store',
    });
    return res.send(buffer);
  }

  @Get(':id/meta')
  async getMeta(@Param('id') id: string) {
    const meta = await this.monday.getItemMeta(id);
    if (!meta) {
      throw new HttpException('Item not found', HttpStatus.NOT_FOUND);
    }
    return meta;
  }
}
