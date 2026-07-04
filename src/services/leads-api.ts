import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";

export type LeadEstado = "nuevo" | "contactado" | "negociando" | "cerrado" | "perdido";

export type ClaimLeadResult =
  | { ok: true }
  | { ok: false; reason: "already-claimed" | "error" };

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
