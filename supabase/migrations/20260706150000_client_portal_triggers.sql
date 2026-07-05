-- Fase 3a — triggers. pg_net para notify (best-effort). Funciones en `private`.
-- Ver docs/superpowers/plans/2026-07-05-fase3a-client-portal.md, GRUPO 2 / Task 3
-- y docs/superpowers/specs/2026-07-05-fase3a-client-portal-design.md §B (modelo
-- de dos caminos para upsell + marcador is_upsell).
create extension if not exists pg_net;

-- URL de la Edge Function notify (misma project ref), armada con el ref conocido:
--   https://nrgrmymsjtgayzejtawa.supabase.co/functions/v1/notify
-- IMPORTANTE: desplegar `notify` con verify_jwt DESHABILITADO (config en
-- supabase/config.toml: [functions.notify] verify_jwt = false), porque el
-- trigger la invoca sin un JWT de usuario. Alternativa más estricta: pasar el
-- service_role key por header desde Vault; para MVP, verify_jwt=false + la
-- función solo actúa sobre eventos conocidos (no expone datos).
--
-- NOTA (al momento de esta migración): la Edge Function `notify` todavía NO
-- está desplegada (bloqueada en secrets provistos por el usuario). Es
-- esperado que net.http_post postee a un 404 — pg_net es async y
-- private.notify_event envuelve la llamada en exception->null, así que el
-- trigger jamás falla por esto.

-- 1) Cliente al cerrar lead / activar extra al cerrar upsell (branch por is_upsell)
create or replace function private.on_lead_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'cerrado' and old.estado is distinct from 'cerrado' then
    if new.is_upsell then
      update public.client_pack_extras
        set estado = 'activo', monto = coalesce(monto, new.monto)
        where source_lead_id = new.id and estado = 'solicitado';
    else
      insert into public.clients (lead_id, pack_template_id)
        values (new.id, new.pack_template_id)
        on conflict (lead_id) do nothing;
    end if;
    perform private.notify_event('sale.closed', jsonb_build_object('lead_id', new.id, 'is_upsell', new.is_upsell));
  end if;
  return new;
end;
$$;
revoke all on function private.on_lead_close() from public, anon, authenticated;

-- Nombre `zz_` para que ordene DESPUÉS de otros AFTER triggers; el guard
-- financiero de Fase 2 (private.leads_financial_integrity) es BEFORE UPDATE
-- (ya committeó la comisión in-row antes de que este trigger corra).
drop trigger if exists trg_zz_client_on_lead_close on public.leads;
create trigger trg_zz_client_on_lead_close
  after update of estado on public.leads
  for each row execute function private.on_lead_close();

-- 2) Upsell perdido → extra a 'rechazado' (libera el índice único parcial)
create or replace function private.on_upsell_lost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'perdido' and old.estado is distinct from 'perdido' and new.is_upsell then
    update public.client_pack_extras
      set estado = 'rechazado'
      where source_lead_id = new.id and estado = 'solicitado';
  end if;
  return new;
end;
$$;
revoke all on function private.on_upsell_lost() from public, anon, authenticated;
drop trigger if exists trg_extra_on_upsell_lost on public.leads;
create trigger trg_extra_on_upsell_lost
  after update of estado on public.leads
  for each row execute function private.on_upsell_lost();

-- 3) Notify on comment (email al cliente SOLO si internal=false — review #8)
create or replace function private.on_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_is_admin boolean;
begin
  author_is_admin := (private.staff_role_of(new.author_user_id) = 'admin');
  if author_is_admin then
    if new.internal = false then
      perform private.notify_event('comment.admin', jsonb_build_object('comment_id', new.id, 'client_id', new.client_id));
    end if;
  else
    perform private.notify_event('comment.client', jsonb_build_object('comment_id', new.id, 'client_id', new.client_id));
  end if;
  return new;
end;
$$;
revoke all on function private.on_comment_insert() from public, anon, authenticated;
drop trigger if exists trg_notify_on_comment on public.client_task_comments;
create trigger trg_notify_on_comment
  after insert on public.client_task_comments
  for each row execute function private.on_comment_insert();

-- 4) Helper notify_event: pg_net POST best-effort. Nunca bloquea al caller.
create or replace function private.notify_event(event_name text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://nrgrmymsjtgayzejtawa.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('event', event_name, 'data', payload)
  );
exception when others then
  -- best-effort: un fallo de notify jamás rompe el insert/cierre (review failure-modes)
  null;
end;
$$;
revoke all on function private.notify_event(text, jsonb) from public, anon, authenticated;

-- 5) moddatetime en clients / client_tasks
-- Watch-point: en Supabase moddatetime vive en el schema `extensions` (no
-- `public`), igual que pgcrypto/uuid-ossp en este proyecto. Se crea calificado
-- y se referencia calificado para no depender del search_path del trigger.
create extension if not exists moddatetime with schema extensions;
drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function extensions.moddatetime(updated_at);
drop trigger if exists trg_client_tasks_updated_at on public.client_tasks;
create trigger trg_client_tasks_updated_at before update on public.client_tasks
  for each row execute function extensions.moddatetime(updated_at);

-- 6) Fix Minor del review de Task 1: FK sin índice (client_task_comments.author_user_id).
create index if not exists idx_client_task_comments_author_user_id
  on public.client_task_comments (author_user_id);
