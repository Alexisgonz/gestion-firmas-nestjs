import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as FormData from 'form-data';
import { DocusealService } from 'src/docu-seal/docu-seal.service';

@Injectable()
export class MondayService {
  constructor(
    private readonly http: HttpService,
    @Inject(forwardRef(() => DocusealService))
    private readonly docuseal: DocusealService,
  ) {}

  // === IDs de columnas en tu board ===
  private readonly FILE_COL_ID = 'file_mkvgrw7j';            // pdf
  private readonly SIGNED_FILE_COL_ID = 'pdf_firmado_final__1';
  private readonly STATUS_COL_ID = 'color_mkvh4f6v';          // gestion_plantilla

  // columnas de email que quieres leer
  private readonly EMAIL_COLS: string[] = [
    'correo_electr_nico0__1',
    'correo_electr_nico6__1',
    'correo_electr_nico7__1',
    'correo_electr_nico__1',
    'correo_electr_nico1__1',
  ];

  // === Query base para traer el item con lo que necesitamos ===
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

  // === Webhook que te envía Monday o tu simulación en Postman ===
  async handleWebhook(payload: any) {
    const itemId = payload?.event?.pulseId || payload?.itemId;
    if (!itemId) return;

    // 1) Traer el item desde Monday
    let item: any;
    try {
      const { data } = await this.http.axiosRef.post(
        process.env.MONDAY_API!,
        { query: this.ITEM_QUERY, variables: { itemId } },
        { headers: { Authorization: process.env.MONDAY_TOKEN! } },
      );
      item = data?.data?.items?.[0];
    } catch (e: any) {
      console.error('❌ Error consultando Monday:', e?.response?.data || e.message);
      return;
    }

    if (!item) {
      console.log(`⚠️ No se encontró el item ${itemId} en Monday`);
      return;
    }

    // 2) Validar estado "Enviado douSel"
    const statusCol = item.column_values?.find((cv: any) => cv.id === this.STATUS_COL_ID);
    const statusText = statusCol?.text?.trim();
    console.log(`📊 Estado actual del item ${itemId}: "${statusText}"`);
    if (statusText !== 'Enviado douSel') {
      console.log(`⚠️ Item ${itemId} no está en "Enviado douSel". Se omite.`);
      return;
    }

    // 3) Extraer URL del PDF + emails
    const { name, fileUrl, emails } = this.extractFileUrlAndEmails(item);
    if (!fileUrl) {
      console.log(`⚠️ El item ${itemId} no tiene PDF en ${this.FILE_COL_ID}`);
      return;
    }
    if (!emails.length) {
      console.log(`⚠️ El item ${itemId} no tiene correos en ${this.EMAIL_COLS.join(', ')}`);
      return;
    }

    console.log(`✅ Procesando item ${itemId}: PDF OK, ${emails.length} email(s). Enviando a DocuSeal…`);
    console.log('🔎 fileUrl:', fileUrl);

    // 4) Descargar PDF (S3 public_url sin header; protected_static con token)
    const pdfResp = await this.http.axiosRef.get(fileUrl, {
      responseType: 'arraybuffer',
      headers: fileUrl.includes('monday.com/protected_static')
        ? { Authorization: process.env.MONDAY_TOKEN! }
        : {},
    });

    // 5) Crear solicitud de firma en DocuSeal
    await this.docuseal.createSignatureRequest({
      fileBuffer: Buffer.from(pdfResp.data),
      filename: `${name || 'documento'}.pdf`,
      signerList: emails.map((email, i) => ({ email, name: `Firmante ${i + 1}` })),
      metadata: { itemId },
    });

    console.log(`🚀 Solicitud de firma enviada a DocuSeal para el item ${itemId}`);
  }

  // === Utilidad: sacar emails y URL del PDF desde el item ===
  private extractFileUrlAndEmails(item: any) {
    const cvs: Array<{ id: string; text: string; value?: string }> = item.column_values || [];

    // Emails
    const emails = this.EMAIL_COLS
      .map((id) => cvs.find((c) => c.id === id)?.text?.trim())
      .filter(Boolean);

    // Columna de archivo
    const fileCol = cvs.find((c) => c.id === this.FILE_COL_ID);

    let pickedAsset: any;
    // A) Buscar por assetId | asset_id en el JSON de la columna
    if (fileCol?.value) {
      try {
        const parsed = JSON.parse(fileCol.value); // {"files":[{ assetId | asset_id }]}
        const f = parsed?.files?.[0] || {};
        const assetId = String(f.assetId ?? f.asset_id ?? '');
        if (assetId) {
          pickedAsset = (item.assets || []).find((a: any) => String(a.id) === assetId);
        }
      } catch { /* ignore */ }
    }

    // B) Fallback: coincidir por nombre o tomar el primer PDF en assets[]
    if (!pickedAsset) {
      const colText = fileCol?.text || '';
      pickedAsset =
        (item.assets || []).find(
          (a: any) =>
            a?.name?.toLowerCase?.() === colText?.split('/').pop()?.toLowerCase?.(),
        ) ||
        (item.assets || []).find((a: any) => a?.name?.toLowerCase?.().endsWith('.pdf')) ||
        (item.assets || [])[0];
    }

    // C) Elegir URL — preferir public_url (S3 firmado), luego url (protected_static), luego text
    const fileUrl =
      pickedAsset?.public_url ||
      pickedAsset?.url ||
      fileCol?.text ||
      '';

    // Debug opcional
    if (pickedAsset) {
      console.log('🔎 pickedAsset:', pickedAsset.id, pickedAsset.name);
    }

    return { name: item.name, fileUrl, emails };
  }

  // === (Opcional) Subir el PDF firmado a la columna pdf_firmado_final__1 ===
  async attachSignedPdf(itemId: number, fileBuffer: Buffer) {
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
    });
  }

  // === (Opcional) Actualizar un status en Monday ===
  async updateStatus(itemId: number, statusColId: string, label: string) {
    const mutation = `
      mutation change_simple_column_value($itemId: Int!, $columnId: String!, $value: String!) {
        change_simple_column_value(item_id: $itemId, column_id: $columnId, value: $value) { id }
      }
    `;
    await this.http.axiosRef.post(
      process.env.MONDAY_API!,
      { query: mutation, variables: { itemId, columnId: statusColId, value: label } },
      { headers: { Authorization: process.env.MONDAY_TOKEN! } },
    );
  }
}
