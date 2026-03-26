// ============================================================
// BE-10: Image validation utility
// Used for product image uploads and any future file upload endpoints
// ============================================================

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImage(file: File): ImageValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido: ${file.type}. Usar JPEG, PNG o WebP.`,
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `Archivo muy grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximo 5MB.`,
    };
  }

  return { valid: true };
}

// Server-side validation for raw buffer + mimetype (used in API routes)
export function validateImageBuffer(
  buffer: Buffer | ArrayBuffer,
  mimeType: string,
  fileName?: string
): ImageValidationResult {
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido: ${mimeType}. Usar JPEG, PNG o WebP.`,
    };
  }

  const size = buffer instanceof Buffer ? buffer.byteLength : buffer.byteLength;
  if (size > MAX_SIZE) {
    return {
      valid: false,
      error: `Archivo muy grande: ${(size / 1024 / 1024).toFixed(1)}MB. Maximo 5MB.`,
    };
  }

  return { valid: true };
}

export { ALLOWED_TYPES, MAX_SIZE };
