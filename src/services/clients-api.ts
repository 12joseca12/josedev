import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type {
  ClientDTO,
  ClientPackExtraDTO,
  ClientPackExtraEstado,
  ClientTaskCommentDTO,
  ClientTaskDTO,
  ClientTaskEstado,
  PackExtraDTO,
  PackTemplateDTO,
  ProjectPhase,
} from "@/lib/types";

export type FetchResult<T> = { ok: true; data: T } | { ok: false; message: string };

type ClientRow = {
  id: string;
  lead_id: string;
  user_id: string | null;
  pack_template_id: string | null;
  project_phase: ProjectPhase;
  created_at: string;
  updated_at: string;
};

type ClientTaskRow = {
  id: string;
  client_id: string;
  titulo: string;
  descripcion: string | null;
  estado: ClientTaskEstado;
  orden: number;
  created_at: string;
  updated_at: string;
};

type ClientTaskCommentRow = {
  id: string;
  client_id: string;
  task_id: string | null;
  author_user_id: string;
  body: string;
  internal: boolean;
  created_at: string;
};

type ClientPackExtraRow = {
  id: string;
  client_id: string;
  pack_extra_id: string;
  gratis: boolean;
  monto: number | null;
  estado: ClientPackExtraEstado;
  source_lead_id: string | null;
  created_at: string;
  pack_extras?: { id: string; slug: string; nombre: string; precio: number | null } | null;
};

type PackTemplateRow = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number | null;
  orden: number;
  activo: boolean;
  created_at: string;
};

type PackExtraRow = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  activo: boolean;
  created_at: string;
};

function mapClientRow(row: ClientRow): ClientDTO {
  return {
    id: row.id,
    leadId: row.lead_id,
    userId: row.user_id,
    packTemplateId: row.pack_template_id,
    projectPhase: row.project_phase,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClientTaskRow(row: ClientTaskRow): ClientTaskDTO {
  return {
    id: row.id,
    clientId: row.client_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    estado: row.estado,
    orden: row.orden,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCommentRow(row: ClientTaskCommentRow): ClientTaskCommentDTO {
  return {
    id: row.id,
    clientId: row.client_id,
    taskId: row.task_id,
    authorUserId: row.author_user_id,
    body: row.body,
    internal: row.internal,
    createdAt: row.created_at,
  };
}

function mapPackTemplateRow(row: PackTemplateRow): PackTemplateDTO {
  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precioBase: row.precio_base,
    orden: row.orden,
    activo: row.activo,
    createdAt: row.created_at,
  };
}

function mapPackExtraCatalogRow(row: PackExtraRow): PackExtraDTO {
  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio: row.precio,
    activo: row.activo,
    createdAt: row.created_at,
  };
}

function mapPackExtraRow(row: ClientPackExtraRow): ClientPackExtraDTO {
  return {
    id: row.id,
    clientId: row.client_id,
    packExtraId: row.pack_extra_id,
    gratis: row.gratis,
    monto: row.monto,
    estado: row.estado,
    sourceLeadId: row.source_lead_id,
    createdAt: row.created_at,
    ...(row.pack_extras
      ? {
          packExtra: {
            id: row.pack_extras.id,
            slug: row.pack_extras.slug,
            nombre: row.pack_extras.nombre,
            precio: row.pack_extras.precio,
          },
        }
      : {}),
  };
}

// -----------------------------------------------------------------------------
// Cliente (self-service, RLS scoped a `user_id = auth.uid()`)
// -----------------------------------------------------------------------------

/**
 * Fila `clients` del usuario autenticado. `data: null` (sin error) significa
 * "autenticado pero no es cliente" — no se distingue de "cliente sin filas" a
 * propósito, el guard de `proxy.ts` ya filtró el acceso a `/area-clientes`.
 */
export async function getMyProject(): Promise<FetchResult<ClientDTO | null>> {
  const supabase = getSupabaseSSRBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "no-session" };

  const { data, error } = await supabase
    .from("clients")
    .select("id, lead_id, user_id, pack_template_id, project_phase, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data ? mapClientRow(data as ClientRow) : null };
}

/** Tareas visibles para la sesión actual — el alcance lo decide la RLS. */
export async function listTasks(clientId: string): Promise<FetchResult<ClientTaskDTO[]>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("client_tasks")
    .select("id, client_id, titulo, descripcion, estado, orden, created_at, updated_at")
    .eq("client_id", clientId)
    .order("orden", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as ClientTaskRow[]).map(mapClientTaskRow) };
}

/**
 * Comentarios del cliente/tarea. La RLS filtra `internal=true` para clientes
 * (solo admin los ve) — este helper no re-filtra nada del lado cliente.
 */
export async function listComments(
  clientId: string,
  taskId?: string,
): Promise<FetchResult<ClientTaskCommentDTO[]>> {
  const supabase = getSupabaseSSRBrowserClient();
  let query = supabase
    .from("client_task_comments")
    .select("id, client_id, task_id, author_user_id, body, internal, created_at")
    .eq("client_id", clientId);
  if (taskId !== undefined) query = query.eq("task_id", taskId);
  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as ClientTaskCommentRow[]).map(mapCommentRow) };
}

/**
 * Publica un comentario como el usuario autenticado (cliente). `internal`
 * siempre `false` acá — la RLS del cliente lo exige (`with check`); postear
 * notas internas es exclusivo de `postAdminComment`.
 */
export async function postComment(
  clientId: string,
  body: string,
  taskId?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "no-session" };

  const { error } = await supabase.from("client_task_comments").insert({
    client_id: clientId,
    task_id: taskId ?? null,
    author_user_id: user.id,
    body,
    internal: false,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Solicita un upgrade de extra. INSERT siempre limpio (`solicitado`, sin
 * monto/gratis/source_lead_id) — la RLS endurecida (review C1) es la única
 * que decide si pasa; este helper JAMÁS manda `activo`/`monto` desde el
 * cliente, eso es decisión exclusiva del admin (`approveExtraDirect` /
 * `sendExtraToPipeline`, ver `actions.ts`).
 */
export async function requestUpgrade(
  clientId: string,
  packExtraId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const { error } = await supabase.from("client_pack_extras").insert({
    client_id: clientId,
    pack_extra_id: packExtraId,
    estado: "solicitado",
    gratis: false,
    monto: null,
    source_lead_id: null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Pack + extras del cliente (join a `pack_extras` para nombre/precio del catálogo). */
export async function listPack(clientId: string): Promise<FetchResult<ClientPackExtraDTO[]>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("client_pack_extras")
    .select(
      "id, client_id, pack_extra_id, gratis, monto, estado, source_lead_id, created_at, pack_extras(id, slug, nombre, precio)",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as unknown as ClientPackExtraRow[]).map(mapPackExtraRow) };
}

// -----------------------------------------------------------------------------
// Admin (lectura/gestión vía RLS admin — mismo cliente SSR, misma sesión)
// -----------------------------------------------------------------------------

/** Todos los clientes (RLS: solo admin ve todas las filas). */
export async function listClients(): Promise<FetchResult<ClientDTO[]>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, lead_id, user_id, pack_template_id, project_phase, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as ClientRow[]).map(mapClientRow) };
}

/** Un cliente por id (RLS: admin, o el propio cliente si es su fila). */
export async function getClient(id: string): Promise<FetchResult<ClientDTO | null>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, lead_id, user_id, pack_template_id, project_phase, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data ? mapClientRow(data as ClientRow) : null };
}

/** Crea una tarea (RLS: solo admin puede insertar en `client_tasks`). */
export async function createTask(
  clientId: string,
  titulo: string,
  descripcion?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const { error } = await supabase.from("client_tasks").insert({
    client_id: clientId,
    titulo,
    descripcion: descripcion ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Actualiza una tarea existente (parcial) — RLS: solo admin. */
export async function updateTask(
  taskId: string,
  patch: Partial<Pick<ClientTaskDTO, "titulo" | "descripcion" | "estado" | "orden">>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const { error } = await supabase.from("client_tasks").update(patch).eq("id", taskId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Cambia la fase del proyecto — RLS: solo admin (los clientes no tienen UPDATE en `clients`). */
export async function updatePhase(
  clientId: string,
  phase: ProjectPhase,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const { error } = await supabase.from("clients").update({ project_phase: phase }).eq("id", clientId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Publica un comentario como admin, con control explícito de `internal`. La
 * RLS de `admin manage comments` exige `author_user_id = auth.uid()` — el
 * helper no puede firmar en nombre de otro admin aunque lo intente.
 */
export async function postAdminComment(
  clientId: string,
  body: string,
  internal: boolean,
  taskId?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "no-session" };

  const { error } = await supabase.from("client_task_comments").insert({
    client_id: clientId,
    task_id: taskId ?? null,
    author_user_id: user.id,
    body,
    internal,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Agrega un extra directamente con un estado explícito (p. ej. `incluido`
 * gratis al armar el pack inicial). Distinto de `requestUpgrade` (cliente,
 * siempre `solicitado`) y de las server actions de upgrade en dos caminos
 * (`approveExtraDirect`/`sendExtraToPipeline`, que operan sobre un extra YA
 * existente). RLS: solo admin puede insertar con `estado != 'solicitado'`.
 */
export async function addExtra(
  clientId: string,
  packExtraId: string,
  opts: { gratis: boolean; monto: number | null; estado: ClientPackExtraEstado },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const { error } = await supabase.from("client_pack_extras").insert({
    client_id: clientId,
    pack_extra_id: packExtraId,
    gratis: opts.gratis,
    monto: opts.monto,
    estado: opts.estado,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Catálogos — CRUD admin (`/admin/packs`). RLS `for all` en ambas tablas ya
// lo permite; el read público de "activo=true" no aplica acá (esta vista
// admin necesita ver también los inactivos para poder reactivarlos).
// -----------------------------------------------------------------------------

/** Todas las plantillas de pack (activas e inactivas), ordenadas por `orden`. */
export async function listPackTemplates(): Promise<FetchResult<PackTemplateDTO[]>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("pack_templates")
    .select("id, slug, nombre, descripcion, precio_base, orden, activo, created_at")
    .order("orden", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as PackTemplateRow[]).map(mapPackTemplateRow) };
}

export type PackTemplateUpsertInput = {
  id?: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  precioBase: number | null;
  orden: number;
  activo: boolean;
};

/** Alta o edición de una plantilla de pack — `id` presente = UPDATE, ausente = INSERT. */
export async function upsertPackTemplate(
  input: PackTemplateUpsertInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const payload = {
    slug: input.slug,
    nombre: input.nombre,
    descripcion: input.descripcion,
    precio_base: input.precioBase,
    orden: input.orden,
    activo: input.activo,
  };

  const { error } = input.id
    ? await supabase.from("pack_templates").update(payload).eq("id", input.id)
    : await supabase.from("pack_templates").insert(payload);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Todos los extras del catálogo (activos e inactivos), orden alfabético por nombre. */
export async function listPackExtras(): Promise<FetchResult<PackExtraDTO[]>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("pack_extras")
    .select("id, slug, nombre, descripcion, precio, activo, created_at")
    .order("nombre", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as PackExtraRow[]).map(mapPackExtraCatalogRow) };
}

export type PackExtraUpsertInput = {
  id?: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  activo: boolean;
};

/** Alta o edición de un extra de catálogo — `id` presente = UPDATE, ausente = INSERT. */
export async function upsertPackExtra(
  input: PackExtraUpsertInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const payload = {
    slug: input.slug,
    nombre: input.nombre,
    descripcion: input.descripcion,
    precio: input.precio,
    activo: input.activo,
  };

  const { error } = input.id
    ? await supabase.from("pack_extras").update(payload).eq("id", input.id)
    : await supabase.from("pack_extras").insert(payload);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
