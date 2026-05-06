import crypto from 'crypto';

/**
 * Generate a short HMAC-SHA256 signature used to gate the public PDF endpoint
 * (`/api/quotes/[id]/pdf?sig=...`). The verification side throws when
 * PDF_SIGNING_SECRET is missing — generation must fail loudly the same way so
 * we never emit links signed with a hardcoded fallback.
 */
export function generatePdfSignature(quoteId: string): string {
  const secret = process.env.PDF_SIGNING_SECRET;
  if (!secret) {
    throw new Error('PDF_SIGNING_SECRET not configured');
  }
  const dayKey = Math.floor(Date.now() / 86400000).toString();
  return crypto
    .createHmac('sha256', secret)
    .update(quoteId + ':' + dayKey)
    .digest('hex')
    .substring(0, 16);
}
