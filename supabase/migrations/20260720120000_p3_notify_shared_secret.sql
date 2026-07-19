-- P3 security fix (M1): authenticate the `notify` Edge Function.
-- Previously notify (verify_jwt=false, no secret) → anyone with the URL could spam
-- admin Telegram / trigger client emails. private.notify_event now sends a Vault-stored
-- shared secret as the `x-notify-secret` header; the Edge Function enforces it ONLY when
-- its NOTIFY_SHARED_SECRET env is set (non-disruptive rollout). Applied to prod via MCP.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'notify_shared_secret') then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'notify_shared_secret',
      'Shared secret between private.notify_event and the notify Edge Function (P3 M1)'
    );
  end if;
end $$;

create or replace function private.notify_event(event_name text, payload jsonb)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'notify_shared_secret' limit 1;
  perform net.http_post(
    url := 'https://nrgrmymsjtgayzejtawa.supabase.co/functions/v1/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object('event', event_name, 'data', payload)
  );
exception when others then
  -- best-effort: un fallo de notify jamás rompe el insert/cierre
  null;
end;
$function$;
