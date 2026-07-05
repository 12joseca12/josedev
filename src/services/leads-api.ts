import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type { LeadDTO, LeadEstado, StaffMemberDTO, StaffRole } from "@/lib/types";

export type ClaimLeadResult =
  | { ok: true }
  | { ok: false; reason: "already-claimed" | "error" };

export type FetchResult<T> = { ok: true; data: T } | { ok: false; message: string };

type LeadRow = {
  id: string;
  conversation_id: string | null;
  assigned_staff_id: string | null;
  estado: LeadEstado;
  fuente: string | null;
  monto: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

type StaffMemberRow = {
  user_id: string;
  email: string;
  role: StaffRole;
  comision: number | null;
  total_ganado: number;
};

function mapLeadRow(row: LeadRow): LeadDTO {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    assignedStaffId: row.assigned_staff_id,
    estado: row.estado,
    fuente: row.fuente,
    monto: row.monto,
    notas: row.notas,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Lista los leads visibles para la sesión actual — el alcance lo decide la
 * policy de RLS (closer: propios + pool sin asignar; admin: todos), acá no se
 * filtra nada por rol.
 */
export async function listLeads(): Promise<FetchResult<LeadDTO[]>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, conversation_id, assigned_staff_id, estado, fuente, monto, notas, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as LeadRow[]).map(mapLeadRow) };
}

/** Staff completo (RLS: legible por cualquier staff) — para reasignación y atribución. */
export async function listStaffMembers(): Promise<FetchResult<StaffMemberDTO[]>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select("user_id, email, role, comision, total_ganado")
    .order("email", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    data: (data as StaffMemberRow[]).map((row) => ({
      userId: row.user_id,
      email: row.email,
      role: row.role,
      comision: row.comision,
      totalGanado: row.total_ganado,
    })),
  };
}

/**
 * Reasignación arbitraria (admin): el WITH CHECK de la policy solo permite
 * destino distinto de uno mismo si el que ejecuta es admin — un closer que
 * llame esto con destino ajeno recibe error de RLS, no hace falta duplicar
 * el chequeo acá. `null` devuelve el lead al pool.
 */
export async function reassignLead(
  leadId: string,
  staffId: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ assigned_staff_id: staffId })
    .eq("id", leadId)
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) return { ok: false, message: "not-found" };
  return { ok: true };
}

/**
 * Reclama un lead sin asignar para el closer autenticado. Optimistic locking:
 * el filtro `assigned_staff_id IS NULL` viaja en la propia query — si otro
 * closer ya lo tomó un instante antes, el UPDATE afecta 0 filas y avisamos
 * "already-claimed" en vez de una falsa confirmación de éxito.
 */
export async function claimLead(leadId: string): Promise<ClaimLeadResult> {
  const supabase = getSupabaseSSRBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "error" };

  const { data, error } = await supabase
    .from("leads")
    .update({ assigned_staff_id: user.id })
    .eq("id", leadId)
    .is("assigned_staff_id", null)
    .select("id");

  if (error) return { ok: false, reason: "error" };
  if (!data || data.length === 0) return { ok: false, reason: "already-claimed" };
  return { ok: true };
}

/**
 * Toma un lead que YA está asignado a otro closer, directamente (sin mediar
 * por admin) — distinto de claimLead (que es para el pool sin asignar). La
 * policy de RLS permite que cualquier staff toque cualquier lead, pero el
 * WITH CHECK solo deja asignárselo a uno mismo (o a admin, cualquier destino).
 */
export async function takeLeadFromAnotherCloser(leadId: string): Promise<ClaimLeadResult> {
  const supabase = getSupabaseSSRBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "error" };

  const { data, error } = await supabase
    .from("leads")
    .update({ assigned_staff_id: user.id })
    .eq("id", leadId)
    .select("id");

  if (error) return { ok: false, reason: "error" };
  if (!data || data.length === 0) return { ok: false, reason: "already-claimed" };
  return { ok: true };
}

/**
 * Cambia el estado de un lead (kanban). El trigger financiero en la base de
 * datos exige `monto` al transicionar a 'cerrado' y bloquea reescribir el
 * monto de un lead ya cerrado sin revertir primero — este helper no duplica
 * esa validación, la deja a la base de datos (fuente de verdad única).
 */
export async function updateLeadEstado(
  leadId: string,
  estado: LeadEstado,
  monto?: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseSSRBrowserClient();
  const payload: Record<string, unknown> = { estado };
  if (monto !== undefined) payload.monto = monto;

  const { error } = await supabase.from("leads").update(payload).eq("id", leadId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
