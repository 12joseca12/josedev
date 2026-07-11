import type { ClientAssetDTO, ClientAssetSource } from "@/lib/types";

export type ClientAssetRow = {
  id: string;
  client_id: string;
  source: ClientAssetSource;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  titulo: string | null;
  descripcion: string | null;
  uploaded_by_user_id: string | null;
  created_at: string;
};

export function buildAssetStoragePath(clientId: string, assetId: string): string {
  return `clients/${clientId}/${assetId}`;
}

export function mapAssetRow(row: ClientAssetRow): ClientAssetDTO {
  return {
    id: row.id,
    clientId: row.client_id,
    source: row.source,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    titulo: row.titulo,
    descripcion: row.descripcion,
    uploadedByUserId: row.uploaded_by_user_id,
    createdAt: row.created_at,
  };
}
