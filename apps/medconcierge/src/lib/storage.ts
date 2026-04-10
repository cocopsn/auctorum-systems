import { createClient } from '@supabase/supabase-js';

// ============================================================
// Supabase storage — patient file attachments.
// First use of Supabase storage in the monorepo. Private bucket
// `patient-files`; server-only access via service-role key.
// Downloads happen through short-lived signed URLs.
// ============================================================

const PATIENT_FILES_BUCKET = 'patient-files';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service role env vars missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadPatientFile(params: {
  tenantId: string;
  patientId: string;
  fileId: string;
  file: File;
}): Promise<string> {
  const { tenantId, patientId, fileId, file } = params;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
  const path = `${tenantId}/${patientId}/${fileId}-${safeName}`;
  const supabase = getServiceClient();
  const { error } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function getPatientFileSignedUrl(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) {
    throw new Error(`Signed URL failed: ${error?.message ?? 'unknown'}`);
  }
  return data.signedUrl;
}

export async function deletePatientFile(storagePath: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .remove([storagePath]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
