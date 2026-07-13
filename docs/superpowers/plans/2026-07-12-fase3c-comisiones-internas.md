# Fase 3c — Finanzas internas / comisiones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track and display closer commissions internally — a `commission_entries` ledger (pending/paid/reversed) driven by the existing lead-close trigger, plus an admin `/admin/finanzas` report and a mark-paid action.

**Architecture:** Extend the verified Fase 2 `private.leads_financial_integrity` trigger to write a per-lead commission ledger alongside the existing `staff_members.total_ganado` accumulator; block un-closing a lead whose commission is already paid. Admin-only RLS; mark-paid is an RLS-gated `pending→paid` UPDATE (immutable once paid). No online payment, no client UI (descoped from billing).

**Tech Stack:** Next.js 16 (App Router, `src/proxy.ts`), React 19, Tailwind 4, Supabase (Postgres + RLS + triggers), Jest.

## Global Constraints

- Supabase project ref `nrgrmymsjtgayzejtawa` (auto-pauses ~1wk idle → `restore_project` + poll before migrating).
- **This migration EDITS the verified Fase 2 financial trigger `private.leads_financial_integrity`.** Keep the close/monto-guard behavior and the total_ganado accumulator (chosen over deriving from the ledger — total_ganado is closer-facing in `closer-kanban-client.tsx`, the ledger is admin-only). ONE intentional behavior change is allowed and expected: the reversal now subtracts the ledger entry's SNAPSHOT amount from the credited closer, instead of Fase 2's recompute against the current `comision`/`assigned_staff_id` (which drifts if either changed post-close). Everything else stays.
- SECURITY DEFINER functions in schema `private`; `set search_path = public`; `revoke all ... from public, anon, authenticated`.
- RLS policies use `(select auth.uid())`, never bare `auth.uid()`; FK columns get a covering index; merge same-role/action policies (avoid multiple_permissive_policies).
- Run `get_advisors(security)` AND `(performance)` after every migration.
- Services live in `src/services/*`, return `FetchResult<T>` = `{ ok: true, data } | { ok: false, message: string }` (read `src/services/leads-api.ts`). Browser client via `getSupabaseSSRBrowserClient()`. `jest.mock()` RELATIVE paths.
- Money: snapshot `monto_base`/`comision_pct` at close (never re-derive from `staff_members` later); `on delete restrict` on money FKs; immutable once `paid`.
- Design tokens `dash-*` only. Admin routes gated by `proxy.ts` (`/admin/*`).

---

### Task 1: DTO + pure ledger helpers

**Files:**
- Modify: `src/lib/types.ts` (append the DTO + estado union)
- Create: `src/services/commissions-calc.ts` (pure helpers)
- Test: `src/services/commissions-calc.test.ts`

**Interfaces:**
- Produces: `CommissionEstado = "pending" | "paid" | "reversed"`; `CommissionEntryDTO`; `CommissionRow` (snake_case DB shape); `mapCommissionRow(row): CommissionEntryDTO`; `summarizeByCloser(entries: CommissionEntryDTO[]): Map<string, { paid: number; pending: number }>`.

- [ ] **Step 1: Add types to `src/lib/types.ts`**

```ts
export type CommissionEstado = "pending" | "paid" | "reversed";

export type CommissionEntryDTO = {
  id: string;
  leadId: string;
  closerUserId: string;
  montoBase: number;
  comisionPct: number;
  commissionAmount: number;
  estado: CommissionEstado;
  paidAt: string | null;
  createdAt: string;
};
```

- [ ] **Step 2: Write the failing test**

```ts
// src/services/commissions-calc.test.ts
import { mapCommissionRow, summarizeByCloser } from "./commissions-calc";
import type { CommissionEntryDTO } from "@/lib/types";

const entry = (over: Partial<CommissionEntryDTO>): CommissionEntryDTO => ({
  id: "e1", leadId: "l1", closerUserId: "c1", montoBase: 1000, comisionPct: 10,
  commissionAmount: 100, estado: "pending", paidAt: null, createdAt: "2026-07-12T00:00:00Z", ...over,
});

describe("commissions-calc", () => {
  it("maps a snake_case row to the DTO", () => {
    expect(mapCommissionRow({
      id: "e1", lead_id: "l1", closer_user_id: "c1", monto_base: 1000, comision_pct: 10,
      commission_amount: 100, estado: "pending", paid_at: null, created_at: "2026-07-12T00:00:00Z",
    })).toEqual(entry({}));
  });

  it("summarizes paid vs pending per closer, ignoring reversed", () => {
    const rows = [
      entry({ id: "a", closerUserId: "c1", commissionAmount: 100, estado: "paid" }),
      entry({ id: "b", closerUserId: "c1", commissionAmount: 50, estado: "pending" }),
      entry({ id: "c", closerUserId: "c1", commissionAmount: 999, estado: "reversed" }),
      entry({ id: "d", closerUserId: "c2", commissionAmount: 30, estado: "pending" }),
    ];
    const s = summarizeByCloser(rows);
    expect(s.get("c1")).toEqual({ paid: 100, pending: 50 });
    expect(s.get("c2")).toEqual({ paid: 0, pending: 30 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- commissions-calc`
Expected: FAIL — `Cannot find module './commissions-calc'`.

- [ ] **Step 4: Implement**

```ts
// src/services/commissions-calc.ts
import type { CommissionEntryDTO, CommissionEstado } from "@/lib/types";

export type CommissionRow = {
  id: string;
  lead_id: string;
  closer_user_id: string;
  monto_base: number;
  comision_pct: number;
  commission_amount: number;
  estado: CommissionEstado;
  paid_at: string | null;
  created_at: string;
};

export function mapCommissionRow(row: CommissionRow): CommissionEntryDTO {
  return {
    id: row.id,
    leadId: row.lead_id,
    closerUserId: row.closer_user_id,
    montoBase: row.monto_base,
    comisionPct: row.comision_pct,
    commissionAmount: row.commission_amount,
    estado: row.estado,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

/** Suma pagado/pendiente por closer. 'reversed' se ignora (no cuenta como deuda ni pago).
 *  Acumula en CENTAVOS enteros para evitar drift de float (0.1+0.2) y reconciliar exacto. */
export function summarizeByCloser(
  entries: CommissionEntryDTO[],
): Map<string, { paid: number; pending: number }> {
  const cents = new Map<string, { paid: number; pending: number }>();
  for (const e of entries) {
    if (e.estado === "reversed") continue;
    const acc = cents.get(e.closerUserId) ?? { paid: 0, pending: 0 };
    const c = Math.round(e.commissionAmount * 100);
    if (e.estado === "paid") acc.paid += c;
    else acc.pending += c;
    cents.set(e.closerUserId, acc);
  }
  const out = new Map<string, { paid: number; pending: number }>();
  for (const [k, v] of cents) out.set(k, { paid: v.paid / 100, pending: v.pending / 100 });
  return out;
}
```

- [ ] **Step 5: Run test + typecheck**

Run: `pnpm test -- commissions-calc && pnpm typecheck`
Expected: PASS, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/services/commissions-calc.ts src/services/commissions-calc.test.ts
git commit -m "feat(3c): CommissionEntryDTO + pure ledger helpers"
```

---

### Task 2: Migration — `commission_entries` table, RLS, trigger extension

**Files:**
- Create: `supabase/migrations/20260712120000_commission_entries.sql`

**Interfaces:**
- Produces (DB): table `public.commission_entries`; partial-unique index; FK indexes; RLS (admin SELECT + admin `pending→paid` UPDATE); extended `private.leads_financial_integrity`.

> Not Jest-testable. Verified by `apply_migration` + `get_advisors` ×2 + live checks in Task 4.

- [ ] **Step 1: Ensure the Supabase project is active** (`get_project`; `restore_project`+poll if paused).

- [ ] **Step 2: Snapshot the current trigger** — run `get_code_snippet`/read `supabase/migrations/20260705130000_leads_financial_integrity.sql` and confirm the live `private.leads_financial_integrity` still matches it before editing (guard against drift).

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712120000_commission_entries.sql
-- Fase 3c — ledger de comisiones + extensión del trigger financiero de Fase 2.
-- Ver docs/superpowers/specs/2026-07-12-fase3c-comisiones-internas-design.md

-- 1) Ledger: una entrada por lead cerrado (snapshot del cierre).
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
create unique index if not exists uq_commission_entries_vigente
  on public.commission_entries (lead_id) where estado in ('pending', 'paid');
create index if not exists idx_commission_entries_closer_user_id on public.commission_entries (closer_user_id);
create index if not exists idx_commission_entries_lead_id on public.commission_entries (lead_id);

-- 2) RLS admin-only. INSERT/estado desde el trigger corre SECURITY DEFINER (no lo gobierna RLS).
alter table public.commission_entries enable row level security;

drop policy if exists "commission select admin" on public.commission_entries;
create policy "commission select admin" on public.commission_entries
  for select to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin');

-- UPDATE admin: SOLO pending→paid (marcar pagada). `using` en pending hace inmutable lo ya
-- paid/reversed. `paid_at is not null` en el check evita marcar 'paid' sin fecha (P2-4).
-- NOTA (P2-4): esta policy no congela las columnas snapshot (monto_base/commission_amount/
-- comision_pct/closer_user_id) durante el UPDATE — es admin-only y la app solo setea
-- estado+paid_at; el column-freeze duro (trigger) queda como hardening diferido (P3).
drop policy if exists "commission mark paid admin" on public.commission_entries;
create policy "commission mark paid admin" on public.commission_entries
  for update to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin' and estado = 'pending')
  with check (private.staff_role_of((select auth.uid())) = 'admin' and estado = 'paid' and paid_at is not null);

-- 3) Extender el trigger financiero de Fase 2 (mantiene total_ganado; añade el ledger + bloqueo si paid).
create or replace function private.leads_financial_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  closer_comision numeric(5, 2);
  v_commission_amount numeric(10, 2);  -- NO nombrar igual que la columna commission_amount (P1-1: ambigüedad)
  v_entry_id uuid;
  v_estado text;
  v_amount numeric(10, 2);
  v_closer uuid;
begin
  -- Transición hacia 'cerrado'
  if new.estado = 'cerrado' and old.estado is distinct from 'cerrado' then
    if new.monto is null then
      raise exception 'No se puede marcar un lead como cerrado sin monto cargado (lead %)', new.id;
    end if;
    if new.assigned_staff_id is not null then
      select comision into closer_comision from public.staff_members where user_id = new.assigned_staff_id;
      if closer_comision is not null then
        v_commission_amount := round(new.monto * closer_comision / 100, 2);
        update public.staff_members set total_ganado = total_ganado + v_commission_amount
          where user_id = new.assigned_staff_id;
        insert into public.commission_entries
          (lead_id, closer_user_id, monto_base, comision_pct, commission_amount)
          values (new.id, new.assigned_staff_id, new.monto, closer_comision, v_commission_amount);
      end if;
    end if;
    return new;
  end if;

  -- Lead ya cerrado: bloquear cambio de monto sin revertir primero (sin cambios).
  if old.estado = 'cerrado' and new.estado = 'cerrado' and new.monto is distinct from old.monto then
    raise exception 'No se puede editar el monto de un lead ya cerrado (lead %) — revertí el cierre primero', new.id;
  end if;

  -- Reversión: de 'cerrado' a otro estado.
  -- Restamos el importe SNAPSHOT (v_amount) del closer ACREDITADO (v_closer, el de
  -- la entrada) — más consistente que el recompute de Fase 2 contra old.assigned_staff_id
  -- + comision actual (que driftea si la comisión o el asignado cambiaron post-cierre).
  if old.estado = 'cerrado' and new.estado is distinct from 'cerrado' then
    -- FOR UPDATE serializa contra "marcar pagada" (que bloquea esta misma fila) →
    -- cierra el TOCTOU (P1-3) donde una comisión pagada en paralelo podría revertirse.
    select id, estado, commission_amount, closer_user_id
      into v_entry_id, v_estado, v_amount, v_closer
      from public.commission_entries where lead_id = new.id and estado in ('pending', 'paid')
      limit 1 for update;
    if v_estado = 'paid' then
      raise exception 'No se puede revertir el cierre del lead %: la comisión ya fue pagada al closer. Resolvé el pago primero.', new.id;
    end if;
    if v_entry_id is not null then
      update public.commission_entries set estado = 'reversed'
        where id = v_entry_id and estado = 'pending';
      update public.staff_members set total_ganado = total_ganado - v_amount
        where user_id = v_closer;
    end if;
    return new;
  end if;

  return new;
end;
$$;
revoke all on function private.leads_financial_integrity() from public, anon, authenticated;
-- El trigger trg_leads_financial_integrity ya existe (Fase 2); create or replace no lo recrea.

-- 4) Backfill (P1-2): entradas 'pending' para leads YA cerrados antes de esta migración,
--    para que el reporte reconcilie (ganado incluye históricos) y la reversión de un
--    lead histórico descuente bien. Snapshot con la comision ACTUAL (la de-cierre no se
--    guardó). Idempotente (not-exists + índice único parcial). En prod hoy: 0 leads
--    cerrados → no-op; correcto para el futuro y otros entornos.
insert into public.commission_entries (lead_id, closer_user_id, monto_base, comision_pct, commission_amount)
select l.id, l.assigned_staff_id, l.monto, s.comision, round(l.monto * s.comision / 100, 2)
from public.leads l
join public.staff_members s on s.user_id = l.assigned_staff_id
where l.estado = 'cerrado' and l.monto is not null and s.comision is not null
  and not exists (
    select 1 from public.commission_entries ce
    where ce.lead_id = l.id and ce.estado in ('pending', 'paid')
  );
```

- [ ] **Step 4: Apply** via `apply_migration` name `commission_entries`. Expected: success.

- [ ] **Step 5: Advisors** — `get_advisors(security)` + `(performance)`. Expected: no NEW findings for `commission_entries` (unindexed-FK, multiple_permissive, RLS-init-plan, security-definer). Empty-table `unused_index` INFO is expected. Fix anything real before proceeding.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712120000_commission_entries.sql
git commit -m "feat(3c): commission_entries ledger + trigger extension + admin RLS"
```

---

### Task 3: `commissions-api.ts` service

**Files:**
- Create: `src/services/commissions-api.ts`

**Interfaces:**
- Consumes: `mapCommissionRow`, `CommissionRow` (Task 1); `getSupabaseSSRBrowserClient`; `FetchResult` (read `leads-api.ts`).
- Produces:
  - `listCommissions(): Promise<FetchResult<CommissionEntryDTO[]>>` — select all `commission_entries` (RLS returns only for admin) ordered `created_at desc`, map rows.
  - `markCommissionPaid(id: string): Promise<FetchResult<void>>` — `update({ estado: "paid", paid_at: new Date().toISOString() }).eq("id", id).eq("estado", "pending").select()`; RLS enforces admin + the pending→paid transition. Check `error` first; then (P3-8) inspect the returned rows — supabase-js does NOT surface an affected-row count without `.select()`, so an RLS/estado miss affects 0 rows with NO error. If `!data || data.length === 0`, return `{ ok: false, message: "not-updatable" }` (already paid/reversed, or not admin).
  - For the per-project view's display names, also fetch the joined lead/client + closer labels: either a Postgres view/embedded select (`select("*, leads(...), ...")`) or a second query mapped client-side. Decide during implementation by reading how `leads-api.ts` joins staff/lead names; mirror it. Keep the joined display shape in a small `CommissionRowView` type in this file (base DTO + `closerName: string | null` + `leadLabel: string | null`).

- [ ] **Step 1: Read `src/services/leads-api.ts`** for the FetchResult helper, browser-client usage, and its join-for-names convention (it already resolves staff/lead labels). Mirror exactly.

- [ ] **Step 2: Implement `listCommissions` + `markCommissionPaid` + the per-closer/per-project queries.** Use `summarizeByCloser` (Task 1) for the per-closer aggregation in the UI layer, OR expose an aggregation helper here that returns `{ closerUserId, closerName, earned, paid, pending }[]` (earned from `staff_members.total_ganado`, paid/pending from `summarizeByCloser`). Enumerate columns (no `select("*")` where a join widens the row unexpectedly).

- [ ] **Step 3: Typecheck + lint** — `pnpm typecheck && pnpm lint` clean. No brittle mock-only tests (thin I/O; pure logic is Task 1).

- [ ] **Step 4: Commit**

```bash
git add src/services/commissions-api.ts
git commit -m "feat(3c): commissions-api (list, mark-paid, per-closer aggregation)"
```

---

### Task 4: Admin UI `/admin/finanzas` + live verification

**Files:**
- Create: `src/app/[locale]/admin/finanzas/page.tsx`
- Create: `src/components/staff-dash/finanzas-client.tsx` (+ a hook if the file grows, mirroring existing staff-dash hooks)
- Modify: the admin nav (find where `/admin/leads`,`/admin/packs`,`/admin/clientes` links live in staff-dash and add "Finanzas")
- Modify: literals source (add `screens`/staff-dash keys for the new page, es+en)

**Interfaces:**
- Consumes: `listCommissions`, `markCommissionPaid`, the per-closer aggregation (Task 3), `summarizeByCloser`, `CommissionEntryDTO`.

- [ ] **Step 1: Read a sibling admin page** (`src/app/[locale]/admin/leads/page.tsx` + its client component + `src/app/[locale]/admin/clientes/[id]/actions.ts`) to mirror: the page/prop shape, the admin table styling (`dash-*`), the fetch-hook + reload pattern, and how a mutating admin button surfaces success/error.

- [ ] **Step 2: Build the page + client component.**
  - **Per-project table:** each `commission_entries` row → lead/client label, `montoBase`, closer name, `commissionAmount`, `estado` badge, and a "Marcar pagada" button shown ONLY when `estado === "pending"` → calls `markCommissionPaid(id)` then reloads; disable in-flight; surface `{ ok: false }` as an inline/toast error (match the sibling's convention). `paid` rows show `paidAt`; `reversed` rows are visually muted.
  - **Per-closer summary:** closer name, **ganado** (total_ganado), **pagado** (Σ paid), **pendiente** (Σ pending) from the aggregation.
  - `dash-*` tokens only; a11y (button `type`, `aria-label` on the per-row mark-paid button disambiguating by lead/closer); es+en literals.

- [ ] **Step 3: Add the nav link** to "Finanzas" (`/${locale}/admin/finanzas`) beside the existing admin links.

- [ ] **Step 4: typecheck + build + tests** — `pnpm typecheck && pnpm build` pass (new route compiles); `pnpm test` green.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/admin/finanzas/page.tsx" src/components/staff-dash/finanzas-client.tsx src/services/literals*
git commit -m "feat(3c): /admin/finanzas commissions report + mark-paid UI"
```

- [ ] **Step 6: End-to-end LIVE verification (the ADR's live layer — the sensitive financial trigger)**

With `pnpm start` + a throwaway admin and a closer with a `comision` set:
1. Assign a lead to the closer, set `monto`, close it → a `pending` `commission_entries` row appears in `/admin/finanzas` with the right amount; `staff_members.total_ganado` increased by that amount.
2. "Marcar pagada" → row becomes `paid` with `paid_at`; `total_ganado` UNCHANGED; the button disappears; per-closer pending↓ / paid↑.
3. Revert a lead whose commission is still `pending` (change estado away from cerrado) → entry becomes `reversed`, `total_ganado` decreased; re-close → a NEW `pending` entry (partial-unique index allows it).
4. **Revert a lead whose commission is `paid` → BLOCKED with the trigger's exception** (the un-close fails). This is the key money-safety check.
5. Close a lead whose closer has `comision` NULL → no entry, no total_ganado change (unchanged Fase 2 behavior).
6. Confirm a non-admin (closer) session gets nothing from `listCommissions` (RLS) and cannot mark paid.

- [ ] **Step 7: Re-run `get_advisors` ×2** after any policy tweak from Step 6. Expected: clean.

---

## Notes for the executor
- Task 2 edits a verified financial trigger — after applying, Step-6 live checks (esp. #4, the paid-reversal block) are the real gate; do NOT declare 3c done on tsc/build alone.
- `total_ganado` stays the "total earned" (pending+paid); marking paid must NOT change it (a common mistake — paid is still earned).
- The mark-paid mutation is RLS-gated (admin, pending→paid). No service-role needed. `using estado='pending'` makes `paid`/`reversed` rows immutable via this policy.
- The Task 4 Step-6 reversal live checks (#3 pending, #4 paid-blocked) also catch a regression of P1-1 (an ambiguous-variable reversal would error) — treat any reversal error as a P1-1 recurrence.

## NOT in scope (deferred, with rationale)
- Online payment / Stripe / Bizum / client-facing invoices — descoped this phase (too complex for the need).
- Closer-facing view of their own commission ledger — the closer keeps `total_ganado` (accrued); per-entry pending/paid stays admin-only (no new closer RLS).
- Hard column-freeze on `paid` rows (trigger enforcing snapshot immutability) — admin-only surface; `paid_at is not null` check is the light guard; freeze is a P3 hardening follow-up.
- Deriving `total_ganado` from the ledger (dropping the accumulator) — considered (outside voice) and rejected (D2): it's closer-facing, ledger is admin-only.
- Un-marking a paid commission, partial payments, PDF/export, tax/IVA, multi-currency.

## What already exists (reused, not rebuilt)
- `private.leads_financial_integrity` (Fase 2) — EXTENDED, not replaced (keeps close/monto-guard/total_ganado).
- `staff_members.total_ganado` / `.comision`, `leads.monto`/`.estado`/`.assigned_staff_id` — reused as the money source of truth + snapshot inputs.
- `private.staff_role_of`, `proxy.ts` `/admin/*` guard, `leads-api.ts` (`FetchResult`, browser client, name-join), staff-dash admin table pattern — reused for the service + UI.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_found → all folded | 9 findings (3×P1, 3×P2, 3×P3), 0 critical gaps left |

**Outside voice (Opus subagent):** caught 9 concrete defects the section review missed. P1-1: local var `commission_amount` collides with the column in the reversal `SELECT ... INTO` → `variable_conflict=error` aborts every reversal (fixed: renamed `v_commission_amount`). P1-2: no backfill for pre-existing closed leads → reversal skips the `total_ganado` decrement + report can't reconcile (fixed: idempotent backfill; prod has 0 closed leads today so it's a no-op now). P1-3: TOCTOU between mark-paid and reversal could reverse a `paid` commission and remove money (fixed: `FOR UPDATE` + `estado='pending'` guard). P2/P3: `paid_at`-not-null check, integer-cent aggregation, `.select()` for 0-row detection, documented reversal-semantics change — all folded.

**CROSS-MODEL:** one tension — outside voice argued `total_ganado` is redundant with the ledger (drop it, derive everything, killing the drift class). Resolved by the user (D2): KEEP `total_ganado` — it's closer-facing (`closer-kanban-client.tsx:220`) and the ledger is admin-only RLS; fix the drift bugs (P1-1/P1-3) instead of removing a live feature.

**VERDICT:** ENG CLEARED — plan hardened (9 findings folded), ready to implement.

NO UNRESOLVED DECISIONS
