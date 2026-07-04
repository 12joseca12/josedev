-- Guarda financiera + reversión para el cierre de leads (Capa 2). Ver DESIGN.md
-- / ADR — Issue 8/9 de la revisión de arquitectura de Leads/CRM.
--
-- Reglas:
-- 1) Transición a 'cerrado' (desde otro estado): exige monto cargado, suma la
--    comisión (staff_members.comision % del monto) al ledger del closer
--    asignado. Sin comisión configurada (NULL), no suma nada.
-- 2) Lead ya 'cerrado' y se intenta cambiar el monto sin antes revertir el
--    cierre: bloqueado — evita que el monto (y por lo tanto la comisión ya
--    sumada) quede desincronizado en silencio.
-- 3) Transición DESDE 'cerrado' hacia cualquier otro estado (reversión
--    explícita): resta la comisión que se había sumado al cerrar.
--
-- SECURITY DEFINER + schema private: la función escribe en
-- staff_members.total_ganado, que no tiene ninguna policy de UPDATE (nadie
-- debería poder tocarlo directo) — sin bypassear RLS acá, un closer cerrando
-- su propio lead (algo que sí puede hacer) fallaría al intentar actualizar su
-- propia fila de staff_members. Mismo patrón que is_staff_member/staff_role_of.

create or replace function private.leads_financial_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  closer_comision numeric(5, 2);
  commission_amount numeric(10, 2);
begin
  -- Transición hacia 'cerrado'
  if new.estado = 'cerrado' and old.estado is distinct from 'cerrado' then
    if new.monto is null then
      raise exception 'No se puede marcar un lead como cerrado sin monto cargado (lead %)', new.id;
    end if;

    if new.assigned_staff_id is not null then
      select comision into closer_comision
      from public.staff_members
      where user_id = new.assigned_staff_id;

      if closer_comision is not null then
        commission_amount := round(new.monto * closer_comision / 100, 2);
        update public.staff_members
        set total_ganado = total_ganado + commission_amount
        where user_id = new.assigned_staff_id;
      end if;
    end if;

    return new;
  end if;

  -- Lead ya cerrado: bloquear cambio de monto sin pasar por reversión primero.
  if old.estado = 'cerrado' and new.estado = 'cerrado' and new.monto is distinct from old.monto then
    raise exception 'No se puede editar el monto de un lead ya cerrado (lead %) — revertí el cierre primero', new.id;
  end if;

  -- Reversión: de 'cerrado' a cualquier otro estado, resta la comisión sumada.
  if old.estado = 'cerrado' and new.estado is distinct from 'cerrado' then
    if old.assigned_staff_id is not null then
      select comision into closer_comision
      from public.staff_members
      where user_id = old.assigned_staff_id;

      if closer_comision is not null and old.monto is not null then
        commission_amount := round(old.monto * closer_comision / 100, 2);
        update public.staff_members
        set total_ganado = total_ganado - commission_amount
        where user_id = old.assigned_staff_id;
      end if;
    end if;

    return new;
  end if;

  return new;
end;
$$;

revoke all on function private.leads_financial_integrity() from public, anon, authenticated;

drop trigger if exists trg_leads_financial_integrity on public.leads;
create trigger trg_leads_financial_integrity
before update on public.leads
for each row
execute function private.leads_financial_integrity();
