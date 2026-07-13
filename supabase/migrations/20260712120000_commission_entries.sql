-- Fase 3c — ledger de comisiones + extensión del trigger financiero de Fase 2.
-- Ver docs/superpowers/specs/2026-07-12-fase3c-comisiones-internas-design.md
-- y docs/superpowers/plans/2026-07-12-fase3c-comisiones-internas.md (eng-reviewed).

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

-- UPDATE admin: SOLO pending→paid. `using` en pending hace inmutable lo ya paid/reversed.
-- `paid_at is not null` evita marcar 'paid' sin fecha (P2-4).
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
  v_commission_amount numeric(10, 2);  -- NO nombrar igual que la columna (P1-1: ambigüedad)
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

  -- Reversión: de 'cerrado' a otro estado. Resta el importe SNAPSHOT del closer ACREDITADO.
  -- FOR UPDATE serializa contra "marcar pagada" (bloquea esa misma fila) → cierra el TOCTOU (P1-3).
  if old.estado = 'cerrado' and new.estado is distinct from 'cerrado' then
    select id, estado, commission_amount, closer_user_id
      into v_entry_id, v_estado, v_amount, v_closer
      from public.commission_entries
      where lead_id = new.id and estado in ('pending', 'paid')
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

-- 4) Backfill (P1-2): entradas 'pending' para leads YA cerrados antes de esta migración.
--    Idempotente (not-exists + índice único parcial). En prod hoy: 0 leads cerrados → no-op.
insert into public.commission_entries (lead_id, closer_user_id, monto_base, comision_pct, commission_amount)
select l.id, l.assigned_staff_id, l.monto, s.comision, round(l.monto * s.comision / 100, 2)
from public.leads l
join public.staff_members s on s.user_id = l.assigned_staff_id
where l.estado = 'cerrado' and l.monto is not null and s.comision is not null
  and not exists (
    select 1 from public.commission_entries ce
    where ce.lead_id = l.id and ce.estado in ('pending', 'paid')
  );
