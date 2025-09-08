// src/monday/monday.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as https from 'https';
import * as FormData from 'form-data';

type ItemMeta = {
  id: string;
  name: string;
  fileUrl: string | null;
  emails: string[];
};

@Injectable()
export class MondayService {
  constructor(private readonly http: HttpService) {}

  private readonly httpsAgent = new https.Agent({
    rejectUnauthorized: process.env.ALLOW_SELF_SIGNED === '1' ? false : true,
  });

  // IDs relevantes de tu board
  private readonly FILE_COL_ID = 'file_mkvgrw7j';
  private readonly SIGNED_FILE_COL_ID = 'pdf_firmado_final__1';
  private readonly STATUS_COL_ID = 'color_mkvh4f6v';

  // columnas de email en el orden deseado
  private readonly EMAIL_COLS: string[] = [
    'correo_electr_nico0__1',
    'correo_electr_nico6__1',
    'correo_electr_nico7__1',
    'correo_electr_nico__1',
    'correo_electr_nico1__1',
  ];

  // Query base
  private readonly ITEM_QUERY = `
    query GetItem($itemId: [ID!]) {
      items(ids: $itemId) {
        id
        name
        column_values(ids: [
          "${this.FILE_COL_ID}",
          "${this.STATUS_COL_ID}",
          ${this.EMAIL_COLS.map((id) => `"${id}"`).join(',')}
        ]) {
          id
          text
          value
        }
        assets {
          id
          name
          public_url
          url
        }
      }
    }
  `;

  /** Trae “meta” listo para el frontend y para descargar PDF */
  public async getItemMeta(itemId: string | number): Promise<ItemMeta | null> {
    const item = await this.getItemBasic(itemId);
    if (!item) return null;

    const { name, fileUrl, emails } = this.extractFileUrlAndEmails(item);
    // normaliza y deduplica correos
    const cleanEmails = Array.from(
      new Set(
        (emails || [])
          .map((e) => String(e || '').trim().toLowerCase())
          .filter(Boolean),
      ),
    );

    return {
      id: String(itemId),
      name,
      fileUrl: fileUrl || null,
      emails: cleanEmails,
    };
  }

  /** GraphQL mínimo; reutilizable internamente */
  private async getItemBasic(itemId: string | number) {
    const { data } = await this.http.axiosRef.post(
      process.env.MONDAY_API!,
      { query: this.ITEM_QUERY, variables: { itemId: String(itemId) } },
      {
        headers: { Authorization: process.env.MONDAY_TOKEN! },
        httpsAgent: this.httpsAgent,
        timeout: 15000,
        validateStatus: () => true,
      },
    );
    return data?.data?.items?.[0] ?? null;
  }

  /** Resuelve URL del PDF + lista cruda de emails */
  private extractFileUrlAndEmails(item: any) {
    const cvs: Array<{ id: string; text: string; value?: string }> =
      item?.column_values || [];

    // Emails en orden
    const emails = this.EMAIL_COLS
      .map((id) => cvs.find((c) => c.id === id)?.text?.trim())
      .filter(Boolean) as string[];

    // Columna de archivo
    const fileCol = cvs.find((c) => c.id === this.FILE_COL_ID);

    // 1) Intenta resolver el assetId desde el JSON de la columna
    let pickedAsset: any;
    if (fileCol?.value) {
      try {
        const parsed = JSON.parse(fileCol.value); // {"files":[{ assetId | asset_id }]}
        const f = parsed?.files?.[0] || {};
        const assetId = String(f.assetId ?? f.asset_id ?? '');
        if (assetId) {
          pickedAsset = (item.assets || []).find(
            (a: any) => String(a.id) === assetId,
          );
        }
      } catch {
        /* ignore */
      }
    }

    // 2) Fallbacks: por nombre o primer PDF o primer asset
    if (!pickedAsset) {
      const colText = fileCol?.text || '';
      const assets = item.assets || [];
      pickedAsset =
        assets.find(
          (a: any) =>
            a?.name?.toLowerCase?.() ===
            colText?.split('/').pop()?.toLowerCase?.(),
        ) ||
        assets.find((a: any) => a?.name?.toLowerCase?.().endsWith('.pdf')) ||
        assets[0];
    }

    // 3) URL preferida: S3 public_url -> protected_static -> texto columna
    const fileUrl =
      pickedAsset?.public_url || pickedAsset?.url || fileCol?.text || '';

    return { name: item?.name, fileUrl, emails };
  }

  /** Descarga un archivo remoto devolviendo Buffer */
  public async downloadFile(url: string): Promise<Buffer> {
    const resp = await this.http.axiosRef.get(url, {
      responseType: 'arraybuffer',
      headers: url.includes('monday.com/protected_static')
        ? { Authorization: process.env.MONDAY_TOKEN! }
        : {},
      httpsAgent: this.httpsAgent,
      timeout: 15000,
      validateStatus: () => true,
    });
    if (resp.status >= 400) {
      throw new Error(`Upstream ${resp.status} al descargar ${url}`);
    }
    return Buffer.from(resp.data);
  }

  /** (Opcional) Subir PDF firmado a Monday */
  public async attachSignedPdf(itemId: number, fileBuffer: Buffer) {
    const mutation = `
      mutation addFile($file: File!, $itemId: Int!) {
        add_file_to_column(item_id: $itemId, column_id: "${this.SIGNED_FILE_COL_ID}", file: $file) { id }
      }
    `;
    const form = new FormData();
    form.append('query', mutation);
    form.append('variables', JSON.stringify({ itemId }));
    form.append('file', fileBuffer, `signed-${itemId}.pdf`);

    await this.http.axiosRef.post(process.env.MONDAY_API!, form, {
      headers: {
        Authorization: process.env.MONDAY_TOKEN!,
        ...(form as any).getHeaders(),
      },
      httpsAgent: this.httpsAgent,
      timeout: 15000,
      validateStatus: () => true,
    });
  }
}
