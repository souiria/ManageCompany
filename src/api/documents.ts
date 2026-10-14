import * as DocumentPicker from 'expo-document-picker';
import { requireSupabase } from '@/lib/supabase';
import type { Document, DocumentType } from '@/types/database';

export const DOCUMENT_BUCKET = 'documents';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB, matches DB constraint

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export interface DocumentLinks {
  affair_id?: string;
  customer_id?: string;
  supplier_id?: string;
  expense_id?: string;
  invoice_id?: string;
  task_id?: string;
}

/** Pick a file, validate type/size, upload to the PRIVATE bucket, store metadata. */
export async function uploadDocument(
  documentType: DocumentType,
  links: DocumentLinks,
): Promise<Document> {
  const supabase = requireSupabase();
  const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets[0]) throw new Error('Sélection annulée');

  const asset = picked.assets[0];
  if (asset.size > MAX_SIZE) throw new Error('Fichier trop volumineux (max 10 Mo)');
  if (asset.mimeType && !ALLOWED_MIME.has(asset.mimeType)) {
    throw new Error('Type de fichier non autorisé (PDF, PNG, JPG, XLSX, DOCX)');
  }

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Session expirée');

  const { data: docRow, error: docError } = await supabase
    .from('documents')
    .insert({
      document_type: documentType,
      file_name: asset.name,
      file_path: 'pending', // replaced below with a unique path
      mime_type: asset.mimeType ?? null,
      size_bytes: asset.size,
      ...links,
      uploaded_by: uid,
    })
    .select()
    .single();
  if (docError) throw docError;

  const filePath = `${uid}/${docRow.id}/${asset.name}`;
  const fileBase64 = await readFileAsBase64(asset.uri);
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(filePath, decodeBase64(fileBase64), {
      contentType: asset.mimeType ?? 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) {
    await supabase.from('documents').delete().eq('id', docRow.id);
    throw uploadError;
  }

  const { data, error } = await supabase
    .from('documents')
    .update({ file_path: filePath })
    .eq('id', docRow.id)
    .select()
    .single();
  if (error) throw error;
  return data as Document;
}

export async function listDocuments(links: DocumentLinks) {
  let query = requireSupabase().from('documents').select('*').order('created_at', { ascending: false });
  for (const [key, value] of Object.entries(links)) {
    if (value) query = query.eq(key, value);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Document[];
}

/** Private access: short-lived signed URL (60 s), never a public URL. */
export async function getDocumentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await requireSupabase()
    .storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(filePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(id: string, filePath: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
  await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath]);
}

// --- file reading helpers (fetch on the file URI works for picked documents) ---
async function readFileAsBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return await blobToBase64(blob);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function decodeBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
