import { isAllowedMime, isWithinSize } from "@/lib/assets-config";
import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type { ClientAssetDTO, ClientAssetSource } from "@/lib/types";

export type FetchResult<T> = { ok: true; data: T } | { ok: false; message: string };

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

// -----------------------------------------------------------------------------
// Storage-backed wrappers (RLS enforces security; this layer is ergonomics +
// early validation only)
// -----------------------------------------------------------------------------

/** Assets visibles para la sesión actual — el alcance lo decide la RLS. */
export async function listAssets(clientId: string): Promise<FetchResult<ClientAssetDTO[]>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("client_assets")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as ClientAssetRow[]).map(mapAssetRow) };
}

export type UploadAssetInput = {
  clientId: string;
  source: ClientAssetSource;
  file: File;
  titulo: string | null;
  descripcion: string | null;
};

/**
 * Sube el archivo al bucket privado `client-assets` e inserta la fila de
 * metadata. El `id` se genera acá y se pasa explícito en el INSERT porque el
 * CHECK `client_assets_storage_path_scope` exige que `storage_path` sea
 * exactamente `clients/{client_id}/{id}` — confiar en el default
 * `gen_random_uuid()` de la DB generaría un id distinto al del path ya subido
 * y el INSERT violaría el constraint. Si el INSERT falla después de subir el
 * archivo, se intenta borrar el objeto (best-effort). OJO: para un CLIENTE ese
 * remove lo deniega la RLS de `storage.objects` — su policy de DELETE resuelve
 * al uploader vía `private.asset_uploader_of(storage_path)`, que devuelve NULL
 * porque la fila nunca llegó a insertarse → el objeto puede quedar huérfano en
 * la carpeta del propio cliente (acotado por el límite del bucket). Para el
 * ADMIN sí funciona (la policy tiene rama admin). Los huérfanos de cliente se
 * limpian con el barrido admin puntual que contempla el spec (fuera de 3b).
 */
export async function uploadAsset(input: UploadAssetInput): Promise<FetchResult<ClientAssetDTO>> {
  if (!isAllowedMime(input.file.type)) return { ok: false, message: "mime-not-allowed" };
  if (!isWithinSize(input.file.size)) return { ok: false, message: "file-too-large" };

  const supabase = getSupabaseSSRBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "no-session" };

  const assetId = crypto.randomUUID();
  const path = buildAssetStoragePath(input.clientId, assetId);

  const { error: uploadError } = await supabase.storage.from("client-assets").upload(path, input.file);
  if (uploadError) return { ok: false, message: uploadError.message };

  const { data, error: insertError } = await supabase
    .from("client_assets")
    .insert({
      id: assetId,
      client_id: input.clientId,
      source: input.source,
      storage_path: path,
      file_name: input.file.name,
      mime_type: input.file.type,
      size_bytes: input.file.size,
      titulo: input.titulo,
      descripcion: input.descripcion,
      uploaded_by_user_id: user.id,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from("client-assets").remove([path]);
    return { ok: false, message: insertError.message };
  }

  return { ok: true, data: mapAssetRow(data as ClientAssetRow) };
}

/** Borra el objeto del bucket y luego la fila de metadata — RLS decide si la sesión puede hacerlo. */
export async function deleteAsset(asset: ClientAssetDTO): Promise<FetchResult<void>> {
  const supabase = getSupabaseSSRBrowserClient();

  const { error: removeError } = await supabase.storage.from("client-assets").remove([asset.storagePath]);
  if (removeError) return { ok: false, message: removeError.message };

  const { error: deleteError } = await supabase.from("client_assets").delete().eq("id", asset.id);
  if (deleteError) return { ok: false, message: deleteError.message };

  return { ok: true, data: undefined };
}

/** URL firmada de corta duración (120s) para ver/descargar un asset del bucket privado. */
export async function createAssetSignedUrl(storagePath: string): Promise<FetchResult<string>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase.storage.from("client-assets").createSignedUrl(storagePath, 120);

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data.signedUrl };
}
