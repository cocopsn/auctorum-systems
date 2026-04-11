import crypto from 'crypto';

export function generatePdfSignature(quoteId: string): string {
  const secret = process.env.PDF_SIGNING_SECRET || 'auctorum-pdf-secret';
  const dayKey = Math.floor(Date.now() / 86400000).toString();
  return crypto.createHmac('sha256', secret).update(quoteId + ':' + dayKey).digest('hex').substring(0, 16);
}
