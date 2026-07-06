# Deploy de la Edge Function `notify` — checklist

La función (`index.ts`) ya está lista. Falta desplegarla y setear secrets. **Esto debe estar hecho ANTES de aplicar la migración de triggers** (`20260706130000_client_portal_triggers.sql`), o el primer comentario/cierre postea a un 404 (best-effort lo traga, pero el live-test parece roto).

## Lo que tenés que conseguir vos (no lo puedo hacer yo)

### 1. Bot de Telegram
1. En Telegram, hablale a **@BotFather** → `/newbot` → seguí los pasos → te da un **token** tipo `123456:ABC-DEF...`. Ese es `TELEGRAM_BOT_TOKEN`.
2. Iniciá conversación con tu bot (mandale cualquier mensaje) para que pueda escribirte.
3. Sacá tu **chat_id**: hablale a **@userinfobot**, te devuelve tu `Id`. Ese número va en `staff_members.telegram_chat_id` de tu cuenta admin.

### 2. Resend (email al cliente)
1. Cuenta en **resend.com** → API Keys → creá una → es `RESEND_API_KEY`.
2. Domains → agregá `josedev.com` → Resend te da registros **SPF/DKIM** para poner en el DNS de josedev.com. Sin verificar el dominio, los mails salen como no-verificados o rebotan.

## Lo que hago yo cuando me pases los dos tokens

```bash
# 1) Secrets
supabase secrets set TELEGRAM_BOT_TOKEN='...' RESEND_API_KEY='...' --project-ref nrgrmymsjtgayzejtawa

# 2) Deploy sin verify_jwt (la invoca la DB, no un usuario con JWT)
supabase functions deploy notify --no-verify-jwt --project-ref nrgrmymsjtgayzejtawa
```

Y agrego a `supabase/config.toml`:
```toml
[functions.notify]
verify_jwt = false
```

Después cargo tu `telegram_chat_id` en `staff_members`, y recién ahí aplico la migración de triggers (Task 3) para que los live-tests de notificación funcionen.

## Estado
- [x] `index.ts` escrito
- [ ] `TELEGRAM_BOT_TOKEN` (vos)
- [ ] `RESEND_API_KEY` + DNS verificado (vos)
- [ ] `supabase secrets set` + `functions deploy --no-verify-jwt` (yo, con tus tokens)
- [ ] `staff_members.telegram_chat_id` cargado (yo)
