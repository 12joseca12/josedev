"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-client";

type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Cliente Supabase server-side con las cookies de la request actual — el
 * único modo de leer la sesión desde una server action (espejo de
 * `createServerClient` en `src/proxy.ts`, pero con el adapter de cookies de
 * `next/headers` en vez del de `NextRequest`/`NextResponse`).
 */
async function getSupabaseActionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components no pueden setear cookies — no-op esperado
            // cuando esto se invoca fuera de un route handler/server action
            // con response mutable. La sesión igual se lee bien.
          }
        },
      },
    },
  );
}

/**
 * Re-check server-side de que el caller es admin — review C2: una server
 * action es un endpoint público invocable por cualquier request firmado con
 * una sesión válida, así que NUNCA se confía en que la UI oculte el botón.
 * Mismo criterio fail-closed que `resolveStaffRole` (src/proxy.ts): cualquier
 * error de lookup o ausencia de fila se trata como "no admin".
 */
async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const supabase = await getSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "no-session" };

  const { data, error } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data || data.role !== "admin") {
    return { ok: false, message: "forbidden" };
  }
  return { ok: true, userId: user.id };
}

/**
 * Provisión de acceso al portal para un cliente. GAP DE DISEÑO conocido:
 * `leads` no tiene columna de email, así que el admin lo ingresa a mano en la
 * UI (no se deriva del lead). Normaliza a lowercase, busca en `auth.users`
 * (Admin API no tiene `getUserByEmail`, así que se filtra `listUsers` por
 * email) y:
 * - Existe → linkea `clients.user_id`, sin tocar password.
 * - No existe → `inviteUserByEmail` (nativo, el cliente elige su propia
 *   contraseña). Envuelto en try/catch: si tira "ya existe" (carrera TOCTOU
 *   entre el check y el invite — review #6), cae al path de link igual.
 */
export async function provisionAccess(clientId: string, email: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { ok: false, message: "email requerido" };

  const service = getSupabaseServiceRoleClient();

  const existingUserId = await findUserIdByEmail(service, normalizedEmail);

  if (existingUserId) {
    return linkClientToUser(service, clientId, existingUserId);
  }

  try {
    const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(normalizedEmail);
    if (inviteError) {
      // TOCTOU: alguien se registró entre el check y el invite.
      const raced = await findUserIdByEmail(service, normalizedEmail);
      if (raced) return linkClientToUser(service, clientId, raced);
      return { ok: false, message: inviteError.message };
    }
    const invitedUserId = invited?.user?.id;
    if (!invitedUserId) return { ok: false, message: "invite sin user id" };
    return linkClientToUser(service, clientId, invitedUserId);
  } catch (err) {
    // Cubre el mismo TOCTOU si el SDK lanza en vez de devolver `error`.
    const raced = await findUserIdByEmail(service, normalizedEmail);
    if (raced) return linkClientToUser(service, clientId, raced);
    const message = err instanceof Error ? err.message : "invite failed";
    return { ok: false, message };
  }
}

async function findUserIdByEmail(
  service: ReturnType<typeof getSupabaseServiceRoleClient>,
  normalizedEmail: string,
): Promise<string | null> {
  // Admin API no expone `getUserByEmail` — se pagina `listUsers` y se filtra
  // por email normalizado (lowercase en ambos lados).
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error || !data) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function linkClientToUser(
  service: ReturnType<typeof getSupabaseServiceRoleClient>,
  clientId: string,
  userId: string,
): Promise<ActionResult> {
  const { error } = await service.from("clients").update({ user_id: userId }).eq("id", clientId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Camino 1 del upgrade en dos caminos: aprobar directo, sin lead ni comisión.
 * UPDATE `solicitado → activo` + `monto`, `gratis=false`. Para extras que el
 * admin gestiona sin mediar closer.
 */
export async function approveExtraDirect(extraId: string, monto: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const service = getSupabaseServiceRoleClient();
  const { error } = await service
    .from("client_pack_extras")
    .update({ estado: "activo", monto, gratis: false })
    .eq("id", extraId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Camino 2 del upgrade en dos caminos: mandar a pipeline cuando corresponde
 * atribución a un closer. Lee `pack_extra_id` del extra, cotiza `monto` desde
 * `pack_extras.precio` (review #3 — el precio cotizado queda registrado en el
 * lead), inserta un lead `is_upsell=true` sin conversación asociada, y
 * linkea `source_lead_id` en el extra (queda `solicitado` hasta que el
 * pipeline de Fase 2 lo cierre — el auto-assign round-robin dispara solo).
 *
 * Guard de idempotencia (hardening Task 11 §D): si el extra ya no está en
 * `solicitado` (p. ej. un doble-click, o ya fue mandado a pipeline / resuelto
 * por otra vía), corta ANTES de insertar el lead. Sin esto, un doble-click
 * crearía dos leads upsell y el segundo `update` pisaría el
 * `source_lead_id` del primero, dejando el lead original huérfano.
 *
 * Guard de precio (review final I1): `pack_extras.precio` es nullable. Si el
 * catálogo no tiene precio cargado, corta ANTES de insertar el lead — un
 * `monto=NULL` en `leads` queda atrapado para siempre por el trigger
 * financiero de Fase 2 (`leads_financial_integrity`, BEFORE UPDATE), que
 * impide cerrar un lead sin monto. Mejor fallar acá, explícito, que dejar el
 * extra varado en `solicitado` con un lead huérfano imposible de cerrar.
 */
export async function sendExtraToPipeline(extraId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const service = getSupabaseServiceRoleClient();

  const { data: extra, error: extraError } = await service
    .from("client_pack_extras")
    .select("id, pack_extra_id, estado")
    .eq("id", extraId)
    .maybeSingle();
  if (extraError) return { ok: false, message: extraError.message };
  if (!extra) return { ok: false, message: "extra not found" };
  if (extra.estado !== "solicitado") {
    return { ok: false, message: "extra no está en estado solicitado" };
  }

  const { data: catalogExtra, error: catalogError } = await service
    .from("pack_extras")
    .select("precio")
    .eq("id", extra.pack_extra_id)
    .maybeSingle();
  if (catalogError) return { ok: false, message: catalogError.message };
  if (catalogExtra?.precio == null) {
    return {
      ok: false,
      message: "el extra no tiene precio de catálogo; asignalo en /admin/packs antes de mandarlo a pipeline",
    };
  }

  const { data: lead, error: leadError } = await service
    .from("leads")
    .insert({
      is_upsell: true,
      monto: catalogExtra.precio,
      conversation_id: null,
    })
    .select("id")
    .single();
  if (leadError) return { ok: false, message: leadError.message };

  const { error: linkError } = await service
    .from("client_pack_extras")
    .update({ source_lead_id: lead.id })
    .eq("id", extraId);
  if (linkError) return { ok: false, message: linkError.message };

  return { ok: true };
}

/** Rechaza un extra solicitado — UPDATE `estado='rechazado'` (libera el índice único parcial, se puede re-pedir). */
export async function rejectExtra(extraId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const service = getSupabaseServiceRoleClient();
  const { error } = await service.from("client_pack_extras").update({ estado: "rechazado" }).eq("id", extraId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
