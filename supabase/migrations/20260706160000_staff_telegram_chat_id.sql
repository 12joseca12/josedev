-- Fase 3a — alter faltante: staff_members.telegram_chat_id (spec §A item 7).
-- Se omitió en la migración de schema (20260706120000); la Edge Function `notify`
-- la lee para las alertas ops de Telegram. Aditivo, nullable, sin default.
alter table public.staff_members
  add column if not exists telegram_chat_id text;
