-- Auto-asignación MVP + logging automático a lead_assignments (Capa 2).
-- Ver DESIGN.md / ADR — Issue 7 de la revisión de arquitectura de Leads/CRM.
--
-- Reparto: si el lead nace sin assigned_staff_id, se reparte automáticamente
-- entre closers (1 closer -> autoasigna; 2+ -> round-robin por menor carga
-- actual; 0 closers -> queda en el pool sin asignar). El algoritmo ponderado
-- por performance queda diferido a TODOS.md.
--
-- Auditoría: cualquier cambio de assigned_staff_id (incluida la asignación
-- inicial) queda logueado en lead_assignments vía trigger — no depende de que
-- el código de aplicación se acuerde de loguearlo.

-- SECURITY DEFINER: necesita ver TODOS los closers y TODOS los leads para
-- calcular el round-robin, sin importar el RLS del usuario que hace el INSERT
-- (un closer dando de alta un lead manual solo ve su propia carga bajo RLS
-- normal, no la de sus compañeros).
create or replace function private.auto_assign_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  closer_count integer;
  picked_closer uuid;
begin
  if new.assigned_staff_id is not null then
    return new;
  end if;

  select count(*) into closer_count
  from public.staff_members
  where role = 'closer';

  if closer_count = 0 then
    return new; -- queda en el pool sin asignar
  elsif closer_count = 1 then
    select user_id into picked_closer
    from public.staff_members
    where role = 'closer';
  else
    -- Round-robin simple: el closer con menos leads asignados actualmente
    -- (empate roto por antigüedad de alta, el que lleva más tiempo sin
    -- lead nuevo entra primero).
    select sm.user_id into picked_closer
    from public.staff_members sm
    left join public.leads l on l.assigned_staff_id = sm.user_id
    where sm.role = 'closer'
    group by sm.user_id, sm.created_at
    order by count(l.id) asc, sm.created_at asc
    limit 1;
  end if;

  new.assigned_staff_id := picked_closer;
  return new;
end;
$$;

drop trigger if exists trg_auto_assign_new_lead on public.leads;
create trigger trg_auto_assign_new_lead
before insert on public.leads
for each row
execute function private.auto_assign_new_lead();

-- SECURITY DEFINER: lead_assignments no tiene policy de INSERT (es un log de
-- auditoría que solo debe escribir el sistema, nunca el usuario directo).
create or replace function private.log_lead_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.assigned_staff_id is not null then
      insert into public.lead_assignments (lead_id, from_staff_id, to_staff_id)
      values (new.id, null, new.assigned_staff_id);
    end if;
    return new;
  end if;

  if new.assigned_staff_id is distinct from old.assigned_staff_id then
    insert into public.lead_assignments (lead_id, from_staff_id, to_staff_id)
    values (new.id, old.assigned_staff_id, new.assigned_staff_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_lead_assignment_insert on public.leads;
create trigger trg_log_lead_assignment_insert
after insert on public.leads
for each row
execute function private.log_lead_assignment();

drop trigger if exists trg_log_lead_assignment_update on public.leads;
create trigger trg_log_lead_assignment_update
after update of assigned_staff_id on public.leads
for each row
execute function private.log_lead_assignment();
