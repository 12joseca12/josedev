# Design — P1: Chat 1:1 asistido por IA (Workers AI) + Consola de Admin

**Fecha:** 2026-07-16
**Estado:** Aprobado (brainstorming) — pendiente de plan de implementación
**Parte de:** Migración a Cloudflare (`2026-07-13-cloudflare-migration-geo-jobs-design.md`), fase P1 — redefinida tras descubrir el alcance real.

---

## 1. Propósito

Convertir el chat del sitio en un **soporte 1:1 asistido por IA con takeover humano**: cualquier usuario registrado habla siempre con el admin (Jose); un asistente de IA responde automáticamente en su nombre; y el admin tiene una **consola** con los chats activos, **badges rojos de no-leídos**, y un **switch para apagar la IA por conversación** y responder él mismo.

La IA se sirve desde **Cloudflare Workers AI** (edge), eliminando la dependencia del home-server/Ollama para este flujo — que era el objetivo original de P1.

## 2. Estado actual (verificado en código)

**El subsistema `admin-chat` ya existe y es la base:**
- **Tablas (Supabase):** `admin_chat_conversations` (`id`, `user_id`, `admin_id`, `created_at`) — 1:1 usuario↔admin; `admin_chat_messages` (`id`, `conversation_id`, `sender_role` ∈ {`user`,`assistant`,`admin`}, `sender_id`, `content`, `message_type` ∈ {`text`,`meeting_picker`}, `created_at`). `leads.conversation_id` tiene FK a `admin_chat_conversations` (SET NULL).
- **Gateway** (`josecoded-api`, `/api/v1/admin-chat/*`, `requireUser`): `GET /thread` (hilo del usuario), `POST /messages` (usuario manda → IA responde), `POST /meeting` (meeting picker), `POST /n8n/inbound` (`optionalUser` — entrada de respuestas vía n8n/Telegram).
- **IA hoy:** `admin-chat-assistant.service.ts` → `callWorker(env, '/ai/admin-chat')` → worker `adminChat` (Ollama, `adminChatKnowledgeFiles` = terminal-chat/about/services/faq/tone). System prompt con marcador `MEETING_PICKER`.
- **Front:** widget del terminal (`use-admin-chat.ts` + `terminal-chat-*`), login-gated (`useAdminChat(open && Boolean(user))`).
- **Admin superuser** se resuelve por `ADMIN_SUPERUSER_ID` / `staff_members.role='admin'` / Auth email.
- **Notificaciones:** existe camino Telegram/n8n para avisar/responder.

**Lo que NO existe:** consola de admin multi-conversación, badges de no-leídos, toggle de IA por conversación, endpoints admin, y la IA en Workers AI.

## 3. Diseño objetivo

```
Usuario registrado ──POST /api/v1/admin-chat/messages──▶ Gateway (Worker)
                                                          │ guarda user msg
                                                          │ ¿conversation.ai_enabled?
                                              ┌───────────┴───────────┐
                                           sí │                       │ no
                                    Workers AI (edge)          solo persistir
                                    + knowledge (R2)           + marcar no-leído
                                    + historial reciente       + notificar admin
                                           │                        (Telegram)
                                    guarda assistant msg
                                                          
Admin (Jose) ──▶ Consola /admin/chats (staff-dash)
   · lista de conversaciones con último mensaje + BADGE ROJO de no-leídos + estado IA
   · abrir hilo → mensajes + caja de respuesta (sender_role='admin', NO dispara IA) + switch IA
   · Supabase Realtime (suscripción a admin_chat_messages) → badges/mensajes en vivo
```

**Principio:** el flujo usuario↔admin↔IA ya existe; P1 (a) reemplaza el backend de IA (Ollama→Workers AI, knowledge→R2), (b) añade el control de IA por conversación, (c) construye la consola de admin con no-leídos en tiempo real.

## 4. Cambios de modelo de datos (migración Supabase — sensible, gated)

`admin_chat_conversations` añade:
- `ai_enabled boolean not null default true` — switch de takeover por conversación.
- `admin_last_read_at timestamptz` (nullable) — marca de lectura del admin.
- `last_message_at timestamptz not null default now()` — para ordenar la lista y detectar actividad.

**No-leído para el admin** = existe `admin_chat_messages` con `sender_role='user'` y `created_at > coalesce(admin_last_read_at, 'epoch')` en esa conversación. Se calcula por query/vista, no se desnormaliza un contador (evita drift).

`last_message_at` se actualiza en cada insert de mensaje (trigger `BEFORE/AFTER INSERT` en `admin_chat_messages`, o en la capa de escritura del gateway — decidir en el plan; preferible trigger para consistencia).

## 5. Flujo de IA (Workers AI en el gateway)

- **Binding Workers AI** en `josecoded-api` (`wrangler.jsonc`; token ya tiene `ai (write)`).
- **Knowledge → R2:** los `.md` de contexto se migran a un bucket R2 (binding en el gateway), leídos con cache. Reemplaza `getKnowledgeContext` del worker para este flujo. Ollama sale del chat.
- **`POST /messages`** (usuario): (1) resolver/crear conversación; (2) insertar mensaje `user`; (3) si `ai_enabled`: construir `messages` (system prompt reusado con marcador `MEETING_PICKER` + knowledge de R2 + N mensajes recientes de historial) → invocar Workers AI → insertar respuesta `assistant`; si no: no invocar IA, marcar no-leído, notificar admin; (4) responder al front el/los mensajes nuevos con el **mismo shape** que hoy (no romper `use-admin-chat`).
- **Modelo:** del catálogo de Workers AI (candidato: `@cf/meta/llama-3.1-8b-instruct`; evaluar `llama-3.3-70b` por calidad). El ID exacto se **verifica contra la doc/catálogo vigente en el plan** (como se hizo con el binding de rate-limit en P0).
- **Timeout/errores:** Workers AI es una llamada de binding (no fetch al home-server); mantener manejo de error → `fail(...)` con status correcto.

## 6. Endpoints admin nuevos (admin-only)

Bajo `/api/v1/admin-chat/admin/*`, protegidos por `requireUser` + chequeo de rol admin (patrón `staff_members.role='admin'` / superuser ya existente):
- `GET /conversations` — lista: por conversación devuelve último mensaje, `unread` (bool/cuenta), `ai_enabled`, `last_message_at`, datos del usuario; orden `last_message_at desc`.
- `GET /conversations/:id/messages` — mensajes de una conversación.
- `POST /conversations/:id/messages` — el admin responde (`sender_role='admin'`); **NO dispara IA**; actualiza `last_message_at`.
- `POST /conversations/:id/ai` — body `{ enabled: boolean }` → set `ai_enabled`.
- `POST /conversations/:id/read` — set `admin_last_read_at = now()` (limpia el badge).

## 7. Consola de admin (staff-dash)

- Nueva sección **`/admin/chats`** + link en el nav de `dash-shell` (junto a leads/clientes/packs/finanzas).
- **Lista:** conversaciones con nombre/email del usuario, preview del último mensaje, **badge rojo** si no-leído, indicador de estado IA (on/off), orden por actividad.
- **Hilo abierto:** mensajes (user/assistant/admin diferenciados), caja de respuesta del admin, **switch IA on/off**, y al abrir marca leído.
- **Realtime:** suscripción Supabase Realtime a `admin_chat_messages` (y/o `admin_chat_conversations`) con el cliente browser autenticado del admin → badges y mensajes nuevos en vivo, sin recargar. Fallback documentado: polling cada ~8s si el canal falla.
- Diseño `dash-*`, responsive (lista/hilo colapsan en mobile), a11y (badges con texto accesible, no solo color), i18n es/en.

## 8. Realtime + RLS / seguridad

- **RLS** en `admin_chat_conversations` y `admin_chat_messages`: el usuario ve solo su propia conversación/mensajes; el admin (rol admin) ve todas. Los endpoints admin re-chequean rol admin además de la RLS (defensa en capas, patrón del repo).
- **Realtime** se habilita en las tablas (publication) y respeta la RLS del cliente autenticado: el admin suscribe a todo; un usuario, si suscribe, solo a lo suyo. Verificar que la RLS impide que un usuario lea conversaciones ajenas por el canal.
- Helpers self-referenciales de rol → `SECURITY DEFINER` en `private` con `set search_path=public` (patrón establecido: `is_staff_member`/`staff_role_of`).
- El toggle `ai_enabled` y el endpoint de respuesta admin son admin-only por RLS + re-check.

## 9. Notificaciones

Reusar el camino existente (Telegram/n8n): **notificar SIEMPRE al admin cuando llega un mensaje `user`**, con la IA encendida o apagada (decisión del usuario) — para que Jose no dependa de tener la consola abierta. Con IA on, el aviso es informativo (la IA ya respondió); con IA off, es el disparador para que responda él. Mantener el `POST /n8n/inbound` existente si se sigue usando Telegram para responder; la consola es un canal adicional, no un reemplazo obligatorio.

## 10. Fuera de alcance (P1)

- Chat verdaderamente anónimo (sin registro) — el chat sigue login-gated por diseño.
- Multi-admin / colas / asignación (solo Jose es admin).
- Adjuntos en el chat, typing indicators en tiempo real del otro lado, entrega/leído por-usuario.
- Búsqueda/archivado de conversaciones (posible v2).
- Streaming de tokens de la IA (v1 responde el mensaje completo; streaming es follow-up).

## 11. Ítems a confirmar en el plan

- Modelo exacto de Workers AI (verificar catálogo vigente) y parámetros (max_tokens, temperature).
- Trigger vs capa-app para `last_message_at`.
- Cuántos mensajes de historial enviar al modelo (ventana de contexto vs coste).
- Nombre del bucket R2 y estructura de los `.md` de knowledge.

## 12. Riesgos

- **RLS + Realtime**: mal configurado, un usuario podría suscribirse a mensajes ajenos — la verificación en vivo (aislamiento por canal) es el gate.
- **Migración sobre tablas con FK viva** (`leads.conversation_id`): las columnas nuevas son aditivas (default), bajo riesgo; igual gated con drift-check + `get_advisors` ×2.
- **Compatibilidad del shape de respuesta** de `POST /messages` con `use-admin-chat` — no romper el contrato del front existente.
- **Calidad del modelo** de Workers AI vs Ollama para el tono del asistente — evaluable en la verificación en vivo; ajustable por prompt/modelo.

## 13. Vista previa de tareas (para el plan)

1. R2 bucket + migración del knowledge `.md` + lector con cache en el gateway.
2. Binding Workers AI + reescritura del reply de IA (reemplaza `callWorker('/ai/admin-chat')`), conservando el system prompt + `MEETING_PICKER`.
3. Migración Supabase: `ai_enabled`/`admin_last_read_at`/`last_message_at` + trigger `last_message_at` + RLS admin/usuario + habilitar Realtime (gated, drift-check + advisors ×2).
4. Endpoints admin (`/admin/conversations*`, toggle IA, read, admin reply) + rol-check.
5. `POST /messages` respeta `ai_enabled` (IA solo si on) + notificación.
6. Consola admin UI (`/admin/chats`: lista + badges + hilo + switch IA + Realtime) + nav + literales es/en.
7. Verificación en vivo (cuentas throwaway): usuario↔IA, toggle off→admin responde, badges/no-leídos, aislamiento RLS/Realtime entre usuarios, advisors ×2.
