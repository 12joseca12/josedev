# P3 — Gate de Ciberseguridad (análisis Fable) — Informe consolidado

**Fecha:** 2026-07-17 · **Modelo de análisis:** Fable (3 agentes en paralelo, read-only)
**Detalle por superficie:** `p3-sec-gateway.md` · `p3-sec-worker.md` · `p3-sec-supabase-secrets.md` (en `.superpowers/sdd/`)

**Totales:** 1 Critical · 3 High · 13 Medium · 18 Low. **Secretos commiteados en el repo: NINGUNO (limpio).**

---

## Clasificación por acción

### 🔴 A. Arreglar ANTES del deploy (P8) — no explotable hoy porque el gateway no está desplegado

- **C1 [Critical] Proxy de dev abierto en prod.** `josecoded-api/wrangler.jsonc` trae `API_MODE=development`; `devApiKeyGuard` (`security.middleware.ts:92-101`) solo bloquea `/api/dev/worker/*` cuando `mode≠development` y **falla abierto** si `DEV_API_KEY` no está seteado → **SSRF sin auth al home server** con el `WORKER_INTERNAL_TOKEN`. **Fix:** deploy con `API_MODE=production` (env-split, ya anotado en P0) + el guard debe fallar cerrado; idealmente NO montar `devWorkerProxyRoutes` en producción.
- **H1 [High] Emulador sin auth ni throttle.** `/demo/android/start|warmup` disparan un boot de ≤360s; `/screen/{tap,swipe,text}` permiten control anónimo del emulador (`emulator.routes.ts`, montado en `index.ts` sin guard). **Fix:** exigir sesión (requireUser) + rate-limit, o gatearlos; decidir si la demo Android sigue siendo pública.
- **H2 [High] `/ai/chat` público solo rate-limit por-IP.** 20/60s evitable rotando IP, sin tope global al LLM self-hosted (`ai.routes.ts`). **NOTA:** tras P1 el chat del sitio usa Workers AI (admin-chat); el `/ai/chat` raíz (proxy a Ollama) **no tiene consumidor en el front**. **Fix recomendado:** eliminar `/ai/chat` raíz + el `/api/v1/ai/chat` protegido si están muertos (lo más simple y seguro), o Turnstile + tope global.

### 🟠 B. Arreglar YA — issues VIVOS en prod (explotables ahora)

- **H3 [High] Defacement del blog.** `blog_posts` tiene INSERT/UPDATE/DELETE abiertos a cualquier `authenticated` (solo `auth.uid()=author_id`) y lectura pública → **cualquier usuario auto-registrado publica posts públicos arbitrarios**. Amplificado por signup abierto + sin confirmación de email. **Fix:** migración RLS restringiendo escritura de `blog_posts` a rol admin/staff (patrón `staff_role_of='admin'`).
- **M1-sec [Medium] Edge Function `notify` sin auth.** `verify_jwt=false`, sin secreto compartido → cualquiera con la URL spamea el Telegram del admin o dispara emails a clientes para `client_id` arbitrario. **Fix:** exigir un shared-secret header (como hace `/n8n/inbound`).
- **M2-sec [Medium] Auto-acreditación de comisiones.** El `USING` del UPDATE de `leads` deja a cualquier staff cerrar cualquier lead con `monto` arbitrario → infla su propio ledger. Mitigado por payout admin-gated + auditoría. **Fix:** endurecer el WITH CHECK / restringir el cierre al closer asignado.

### 🔑 C. Rotar credenciales (acción del usuario — expuestas en dev/chat)

1. **Token del bot de Telegram**
2. **API key de Resend**
3. **Password SSH/sudo de Omen** (`Elenalamejor12` — pegada en este chat; ya tengo acceso por clave, no la necesito)
4. Revisar la `SUPABASE_SERVICE_ROLE_KEY` (si estuvo en dev)
5. Considerar el `WORKER_INTERNAL_TOKEN` (rotarlo en el cutover P8, sincronizado con Omen)

### 🟡 D. Hardening (Medium/Low — no bloquean, agendar)

- **Gateway:** fuga de info por `onError`+`toUpstreamFail` (mensajes upstream al cliente); `/system/status` top-level sin auth; N+1 en GET del foro; rate-limit del foro en memoria por-isolate (evitable); webhook n8n saliente sin firma (PII); headers de seguridad quizá ausentes en `Response` crudas.
- **Worker:** M1 `docker.service.ts:61` interpola `command` raw en shell (footgun latente, no alcanzable hoy — migrar a `execFile`); M2 confía el MIME declarado por el cliente en uploads (sniff + allow-list de extensiones); M3 inyección `adb shell` (solo emulador).
- **Lows:** 18 nits varios (ver reportes por superficie).

---

## Puntos fuertes confirmados (buena higiene)

- **Data layer sólido:** RLS habilitado en las 14 tablas sensibles; toda función `private.*` SECURITY DEFINER pinnea `search_path` y está revocada de public/anon/authenticated; trigger financiero con reversión `FOR UPDATE` TOCTOU-hardened + block de pagadas; storage RLS de dos capas.
- **Gateway:** verificación remota de JWT (sin decode local); `assertAdmin` server-side (no confía en RLS); sin SQL raw (supabase-js parametrizado); zod exhaustivo; sin secretos en `vars`; service-role solo server-side; la salida del LLM no otorga acciones privilegiadas.
- **Worker:** superficie de ejecución de comandos **NO explotable vía HTTP** (todo valor a shell viene de env/validado/escapado; screenshot usa `execFile`); token `timingSafeEqual`; `/health` única ruta sin auth; defensas de path-traversal correctas.
- **Repo limpio:** ningún secreto real commiteado; `.gitignore` excluye `.dev.vars`/`.env`.

---

## Recomendación de orden

1. **Ya (vivo):** H3 blog RLS + M1-sec notify auth (migración + Edge Fn) → cierra los dos explotables ahora.
2. **Antes de P8:** C1 (API_MODE/dev-proxy) + H1 (emulador) + H2 (eliminar/gatear `/ai/chat` muerto).
3. **Usuario:** rotar las 3-5 credenciales.
4. **Backlog:** los Medium/Low de hardening.
