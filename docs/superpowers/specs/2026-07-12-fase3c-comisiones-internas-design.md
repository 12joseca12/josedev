# Fase 3c — Finanzas internas / comisiones (descopeada) — Design Spec

Fecha: 2026-07-12 · Estado: aprobado (brainstorming) · Depende de: Fase 2 (leads + `leads_financial_integrity`), Fase 1 (`staff_members`).

## Contexto y descomposición

**Descope explícito:** la fase 3c original (facturación con Stripe/Bizum + webhooks + `/area-clientes/facturacion` + cobro online al cliente) se consideró demasiado compleja para lo que se necesita ahora. El objetivo real es más chico y **100% interno**: **ver** los montos que ya se calculan y **trackear si al closer ya se le pagó** su comisión. Sin Stripe, sin webhooks, sin schema de invoices, sin nada de cara al cliente.

**Qué ya existe (Fase 2, verificado contra el código):**
- `leads.monto` — monto del proyecto (obligatorio al cerrar; inmutable en cerrado sin revertir).
- `staff_members.comision` (numeric %) — % del closer; `staff_members.total_ganado` — acumulado de comisión, mantenido por el trigger `private.leads_financial_integrity` (BEFORE UPDATE on leads): al cerrar suma `round(monto*comision/100,2)` a `total_ganado`; al revertir (cerrado→otro) lo resta; bloquea editar monto en cerrado.

**El gap:** `total_ganado` es un **único número acumulado** — no distingue pagado vs pendiente ni tiene detalle por comisión. Falta (a) un ledger por-comisión con estado de pago, y (b) vistas admin para leerlo.

Alcance de un solo spec/plan. No se descompone.

## Sección A — Modelo de datos

### Tabla `public.commission_entries`
Una entrada por lead cerrado. Snapshot del cierre (monto y % del momento) para que un cambio futuro de `staff_members.comision` NO reescriba lo histórico.
```sql
create table if not exists public.commission_entries (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete restrict,
  closer_user_id uuid not null references auth.users (id) on delete restrict,
  monto_base numeric(10, 2) not null,
  comision_pct numeric(5, 2) not null,
  commission_amount numeric(10, 2) not null,
  estado text not null default 'pending' check (estado in ('pending', 'paid', 'reversed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
-- Único parcial: una comisión vigente por lead, pero permite re-cerrar tras una reversión.
create unique index if not exists uq_commission_entries_vigente
  on public.commission_entries (lead_id)
  where estado in ('pending', 'paid');
create index if not exists idx_commission_entries_closer_user_id on public.commission_entries (closer_user_id);
create index if not exists idx_commission_entries_lead_id on public.commission_entries (lead_id);
```
`on delete restrict` en ambos FK (dinero: no se borra en cascada). Sin `updated_at` (transiciones puntuales, `paid_at` marca el pago).

### Patrones aplicados (del ADR)
Financial data immutable+reversible+ledger. Snapshot de valores al cerrar (no re-derivar de `staff_members` después). Índice único parcial por estado vigente (idéntico a `client_pack_extras` de 3a). FK-index pre-empt de `get_advisors(performance)`. RLS → SECURITY DEFINER en `private`. `(select auth.uid())`.

## Sección B — Trigger (extiende Fase 2) + RLS

### Extensión de `private.leads_financial_integrity`
Se modifica la función existente (schema `private`, SECURITY DEFINER, BEFORE UPDATE on leads). `total_ganado` **se mantiene tal cual** (sigue = total ganado = pending+paid, sumado al cerrar / restado al revertir). El ledger se escribe en paralelo, driven por los mismos eventos → consistente por construcción.
- **Cierre** (`→ 'cerrado'`): además de sumar a `total_ganado` (como hoy), INSERT en `commission_entries` (`estado='pending'`, snapshot de `monto_base=new.monto`, `comision_pct=closer_comision`, `commission_amount`). Solo si hay `assigned_staff_id` + `comision` no NULL (mismo guard que hoy).
- **Reversión** (`'cerrado' → otro`): buscar la entrada vigente del lead.
  - Si `estado='paid'` → **`raise exception`** ("no se puede revertir un lead cuya comisión ya fue pagada — resolvé el pago primero"). Bloqueo (decisión de diseño).
  - Si `estado='pending'` → marcarla `estado='reversed'` y restar de `total_ganado` (como hoy).
- **Cambio de monto en cerrado**: ya bloqueado (revertí primero) — sin cambios. (Implica: para editar el monto hay que revertir, lo que exige que la comisión NO esté pagada — coherente.)

SECURITY DEFINER en `private`, `set search_path=public`, `revoke ... from public, anon, authenticated`. `get_advisors` ×2 tras la migración.

### RLS — `commission_entries` (admin-only)
```
alter table public.commission_entries enable row level security;
-- SELECT admin
create policy "commission select admin" ... using (private.staff_role_of((select auth.uid())) = 'admin');
-- UPDATE admin: solo la transición pending→paid (marcar pagada). Ver Sección C.
```
El INSERT/UPDATE-de-estado desde el trigger corre como SECURITY DEFINER (no lo gobierna la RLS). El cliente y los closers no ven esta tabla (fuera de alcance).

## Sección C — Acción "marcar pagada"

Server action admin (`src/services/…`): primera línea re-check admin, luego service-role (patrón del proyecto). Transición **`pending → paid`** (set `estado='paid'`, `paid_at=now()`). **Inmutable una vez `paid`** (no hay des-marcado; decisión de diseño). Guard: solo entradas `pending` (idempotencia + no re-pagar una `reversed`). Alternativa RLS-nativa (policy UPDATE admin con `with check estado='paid'` y `using estado='pending'`) es aceptable si se prefiere sobre service-role — elegir en el plan; la semántica es la misma.

## Sección D — UI admin + verificación

### Ruta `/admin/finanzas` (nueva, gateada por `proxy.ts` como el resto de `/admin/*` — admin)
- **Por proyecto**: tabla de `commission_entries` (join a `leads`/`clients` para nombre): lead/cliente, `monto_base`, closer, `commission_amount`, `estado`, botón "Marcar pagada" (solo en `pending`). Reusa el patrón de tabla + server action de otras vistas admin.
- **Por closer**: agregado — closer, **ganado** (`staff_members.total_ganado`), **pagado** (Σ `commission_amount` where `paid`), **pendiente** (Σ where `pending`).

### Capa de servicios
`src/services/commissions-api.ts` (patrón `leads-api.ts`, `FetchResult`): listar entradas (join), agregados por closer, `markCommissionPaid(id)`. Helpers puros: cálculo/redondeo de comisión, agregadores pagado/pendiente/ganado, mapeador fila→viewmodel.

### Verificación (las 3 capas del ADR)
1. **Jest** (testeable): helpers puros — `round(monto*pct/100,2)`, agregadores por closer, mapeador. `jest.mock()` rutas relativas.
2. **En vivo con cuenta descartable** (trigger/RLS no testeables con Jest): cerrar lead → entrada `pending` creada + `total_ganado` sumado; marcar pagada → `paid`+`paid_at`, `total_ganado` sin cambios; revertir lead pendiente → entrada `reversed` + `total_ganado` restado; **revertir lead pagado → bloqueado (exception)**; re-cerrar tras reversión → nueva entrada vigente (índice único parcial lo permite). Cliente/closer NO ven la tabla.
3. **`get_advisors(security)` + `(performance)`** tras la migración.

## Fuera de alcance de 3c (YAGNI)
Pago online (Stripe/Bizum), facturas/recibos al cliente, `/area-clientes/facturacion`, vista del closer de sus propias comisiones, des-marcado de "pagada", pagos parciales, exportar/PDF, impuestos/IVA, moneda multi.

## Prerrequisitos operativos
- Proyecto Supabase activo (auto-pausa → `restore_project` + poll antes de migrar).
- Respaldar el ADR antes de cualquier `index_repository`.
- La migración TOCA la función financiera verificada de Fase 2 — cambio sensible: probar en vivo el cierre/reversión/bloqueo antes de dar por cerrada la capa.

## Qué ya existe (reuso verificado contra el código)
- `leads` (con `monto`, `estado`, `assigned_staff_id`), `staff_members` (`comision`, `total_ganado`), `private.leads_financial_integrity` (a extender), `private.staff_role_of`, `proxy.ts` guard `/admin/*`, patrón server-action admin + `leads-api.ts` + tablas admin en `staff-dash`.

## Failure modes de los codepaths nuevos
- **Doble marcado / re-pago**: el guard `pending`-only + la inmutabilidad de `paid` lo evitan (idempotente).
- **Reversión de lead pagado**: el trigger la bloquea con exception (fail-closed) — el admin debe resolver el pago primero.
- **`comision` cambia después del cierre**: no afecta entradas ya creadas (snapshot `comision_pct`/`monto_base`). Solo afecta cierres futuros.
- **Drift `total_ganado` vs ledger**: ambos los mueve el mismo trigger desde los mismos eventos → consistentes por construcción; marcar-pagada no toca `total_ganado` (pagado sigue siendo ganado).
- **Borrado de lead/closer**: `on delete restrict` bloquea el borrado si hay comisión (dinero no se pierde en silencio).
