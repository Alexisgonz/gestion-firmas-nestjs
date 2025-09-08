import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as FormData from 'form-data';

type Signer = { email: string; name?: string; role?: string };

@Injectable()
export class DocusealService {
  private readonly base = process.env.DOCUSEAL_API!;     // ej: http://localhost:3000/api
  private readonly token = process.env.DOCUSEAL_TOKEN!;  // X-Auth-Token
  private readonly defaultWebhook = process.env.DOCUSEAL_WEBHOOK_URL || '';

  constructor(private readonly http: HttpService) {}

  // ---------- Helpers ----------
  private authHeaders() {
    return this.token ? { 'X-Auth-Token': this.token } : {};
  }

  private formHeaders(form: FormData) {
    return {
      ...(form as any).getHeaders(),
      ...this.authHeaders(),
    };
  }

  // ---------- API ----------
  /**
   * Crea una submission en DocuSeal desde un PDF
   */
  async createSignatureRequest(opts: {
    fileBuffer: Buffer;
    filename: string;
    signerList: Signer[];
    title?: string;
    message?: string;
    metadata?: Record<string, any>;
    webhookUrl?: string;
  }) {
    const {
      fileBuffer,
      filename,
      signerList,
      title,
      message,
      metadata,
      webhookUrl,
    } = opts;

    if (!fileBuffer || !filename) {
      throw new Error('Debes proveer fileBuffer y filename');
    }
    if (!Array.isArray(signerList) || signerList.length === 0) {
      throw new Error('signerList es requerido y no puede estar vacío');
    }

    // submitters requeridos en tu instancia
    const submitterEmail =
      process.env.DOCUSEAL_SUBMITTER_EMAIL || signerList[0].email;
    const submitterName =
      process.env.DOCUSEAL_SUBMITTER_NAME || signerList[0].name || 'Middleware';

    // form-data multipart
    const form = new FormData();
    form.append('template_files[]', fileBuffer, filename);

    signerList.forEach((s, i) => {
      form.append(`signers[${i}][email]`, s.email);
      if (s.name) form.append(`signers[${i}][name]`, s.name);
      if (s.role) form.append(`signers[${i}][role]`, s.role);
    });

    form.append('submitters[0][email]', submitterEmail);
    form.append('submitters[0][name]', submitterName);

    if (title) form.append('title', title);
    if (message) form.append('message', message);
    if (metadata) form.append('metadata', JSON.stringify(metadata));
    if (webhookUrl || this.defaultWebhook) {
      form.append('webhook_url', webhookUrl || this.defaultWebhook);
    }

    try {
      const { data } = await this.http.axiosRef.post(
        `${this.base}/submissions`,
        form,
        { headers: this.formHeaders(form) },
      );
      return data;
    } catch (e: any) {
      console.error(
        'DocuSeal multipart error:',
        e?.response?.status,
        e?.response?.data || e.message,
      );
      throw e;
    }
  }

  async getSubmission(submissionId: string) {
    const { data } = await this.http.axiosRef.get(
      `${this.base}/submissions/${submissionId}`,
      { headers: this.authHeaders() },
    );
    return data;
  }

  async downloadSignedPdf(submissionId: string): Promise<Buffer> {
    try {
      const { data } = await this.http.axiosRef.get(
        `${this.base}/submissions/${submissionId}/download`,
        { responseType: 'arraybuffer', headers: this.authHeaders() },
      );
      return Buffer.from(data);
    } catch (e) {
      const submission = await this.getSubmission(submissionId);
      const firstDocId = submission?.documents?.[0]?.id;
      if (!firstDocId) throw e;

      const { data } = await this.http.axiosRef.get(
        `${this.base}/submissions/${submissionId}/documents/${firstDocId}/download`,
        { responseType: 'arraybuffer', headers: this.authHeaders() },
      );
      return Buffer.from(data);
    }
  }
}
