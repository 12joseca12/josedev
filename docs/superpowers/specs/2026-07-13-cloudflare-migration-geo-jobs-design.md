# Design — Migración a Cloudflare + Fiabilidad, GEO y Sistema de Empleo

**Fecha:** 2026-07-13
**Estado:** Aprobado (brainstorming) — pendiente de convertir a plan de implementación
**Autor:** Jose + Claude

---

## 1. Propósito

Llevar josedev.com (front + API + backend) a una arquitectura más fiable y escalable sobre **la cuenta Cloudflare del usuario**, resolviendo los frenos de escalado detectados, y sumando dos capacidades nuevas: **GEO** (que los LLMs reconozcan y recomienden el sitio) y un **sistema de búsqueda de empleo con dashboard**.

Motiva este trabajo un análisis previo que encontró tres frenos reales para más usuarios:
1. **Ollama síncrono en el home server** — una inferencia a la vez; se forma cola con pocos usuarios concurrentes.
2. **Túnel ngrok** — punto único de fallo, URL inestable, límites del plan free.
3. **Desajuste de timeout** — el gateway aborta `/ai/chat` a los 10s ([worker.service.ts:26](../../../josecoded-api/src/services/worker.service.ts)) mientras el worker espera 60s ([env.ts:28](../../../../josecoded-worker/src/config/env.ts)) → 504 en respuestas que iban a completarse.

Objetivo de éxito: sitio y API desplegados en Cloudflare (cuenta del usuario), chat público sin depender del home server, gates de seguridad/SEO/GEO superados, favicon/assets correctos, y un dashboard de empleo operativo — todo entregable por fases independientes.

## 2. Estado actual (verificado en código)

```
Navegador → CF Worker "josecoded-api" (Hono gateway) → ngrok → Home server "Omen" (Fastify :4000)
                                                                    ├── Ollama :11434 (chat/blog IA)
                                                                    ├── n8n :5678
                                                                    ├── Docker android-emulator :6080
                                                                    └── disco: knowledge/ + storage/
```

- **Front:** Next 16.2.4 / React 19.2.4, `next build`/`next start` estándar, **sin adapter Cloudflare** (ni OpenNext ni Pages). Middleware en `src/proxy.ts` (guards `/admin|/closer|/staff`, `resolveClientAccess`). i18n `/es` `/en`. Se asume hosting actual en Vercel (a confirmar).
- **API gateway (`josecoded-api/`):** ya es un Cloudflare Worker (Hono) con `wrangler.jsonc`. Auth Supabase por request, CORS por env, security headers, rate-limit **en memoria** (`Map` por isolate — inefectivo a escala), `/ai/*` limitado a 20/min/IP, `/ai/chat` **público**. Proxya al worker vía `callWorker` (Bearer `WORKER_INTERNAL_TOKEN`, timeout 10s default).
- **Worker (`josecoded-worker`, home server "Omen" `192.168.1.176`):** Fastify, systemd, token interno con `timingSafeEqual` (OK). Servicios: `ai` (Ollama, `stream:false`, síncrono), `command` (`exec` con `shellEscape`), `knowledge` (lista plana de `.md`, cache 60s), `storage`, `emulator` (Docker), `n8n`, `health`. Timeouts worker: chat 60s, admin-chat 60s, blog 120s.
- **Supabase** (`nrgrmymsjtgayzejtawa`, ACTIVE_HEALTHY): auth + datos + RLS. Es la fuente de verdad de datos.

## 3. Arquitectura objetivo

```
Navegador
 └── Cloudflare (cuenta del usuario)
      ├── Front: Next 16 vía OpenNext → Workers   (SSR + middleware proxy.ts + ISR)
      ├── API gateway: josecoded-api (Worker)
      │     ├── Workers AI  → chat público (LLM en el edge)
      │     ├── Supabase (auth + RLS)
      │     ├── Rate limiting NATIVO de Cloudflare
      │     └── Cloudflare Tunnel ──┐
      ├── R2 (assets / ISR cache / knowledge .md)
      └── KV (config / estado)      │
 Home server "Omen" (detrás del Tunnel, ya no ngrok) ◄─┘
      ├── Fastify worker: emulador, n8n, storage, IA interna (blog/admin vía Ollama)
      ├── Docker android-emulator
      └── Ollama  → SOLO blog/admin interno (bajo volumen)
```

**Principio rector:** el chat público (lo más usado) deja de depender del home server y de Ollama síncrono. Omen queda solo para emulador, n8n, storage e IA interna, expuesto por un túnel estable de nivel producción.

## 4. Fases

Cada fase es un entregable independiente y verificable. Regla de modelo (routing del usuario): **Fable = análisis/estrategia**, **Opus/Sonnet = ejecución**.

### P0 — Cuenta Cloudflare + fiabilidad base
**Meta:** dejar la infra actual estable y lista para desplegar en la cuenta del usuario, sin cutover todavía.
- Autenticar `wrangler` con la cuenta del usuario; fijar `account_id`/zona; verificar el dominio y dónde vive el DNS hoy.
- **Cloudflare Tunnel (cloudflared)** en Omen como named tunnel con hostname estable → reemplaza ngrok. Actualizar `WORKER_URL` y retirar el manejo del interstitial de ngrok ([worker.service.ts:41](../../../josecoded-api/src/services/worker.service.ts)).
- **Rate limiting nativo de Cloudflare** (regla/binding) para `/ai/*` y escrituras del foro → reemplaza el `Map` en memoria ([security.middleware.ts:21](../../../josecoded-api/src/middlewares/security.middleware.ts)).
- **Fix timeout `/ai/chat`**: pasar `timeoutMs` explícito (env) en la llamada a `callWorker` ([ai.routes.ts:20](../../../josecoded-api/src/modules/ai.routes.ts)) — interino hasta P1.
- (Opcional) verificación local del JWT de Supabase en el gateway para quitar el round-trip por request.
**Verificación:** túnel arriba y estable; `/ai/chat` responde >10s sin 504; rate-limit rechaza en exceso desde varias IPs; `get_advisors` limpio.

### P1 — Chat público → Workers AI
**Meta:** el chat público corre en el edge, sin tocar el home server.
- Binding **Workers AI** en el gateway; reescribir `/ai/chat` para invocar un modelo del catálogo (elección de modelo en esta fase).
- Migrar el **knowledge context** (`.md`) a **R2** (o embebido), reusando el system prompt actual.
- Ollama queda **solo** para blog/admin interno (vía Tunnel).
- Rate-limit del chat + **Turnstile** opcional para frenar abuso anónimo.
**Verificación:** chat público responde desde Workers AI con el contexto correcto; home server no recibe tráfico de chat público; latencia y coste medidos.

### P2 — Front Next 16 → Cloudflare (OpenNext → Workers)
**Meta:** el front compila y corre en Workers, en preview, **sin cutover**.
- Añadir `@opennextjs/cloudflare` + `wrangler`; adaptar `next.config`, el middleware `proxy.ts`, env/secrets (Supabase, URL del gateway), **R2** para cache ISR e imágenes.
- Verificar compatibilidad de OpenNext con **Next 16** y App Router (riesgo conocido: reciente).
**Verificación:** build de Workers verde; SSR, guards de `proxy.ts`, i18n y rutas dinámicas funcionan en preview; sin regresiones vs Vercel.

### P3 — Gate de ciberseguridad **[Fable]**
**Meta:** pasada de seguridad completa antes de exponer en la nueva infra.
- Alcance: auth/CORS/headers/rate-limit del gateway; superficie `exec` del worker (confirmar escaping en todos los callers del emulador o migrar a `execFile`); RLS de Supabase; gestión de secretos (Workers, n8n, Tunnel); Workers AI; **rotación de credenciales pegadas en chat** (Telegram, Resend, SSH/sudo).
- Herramienta: gstack `/cso` con razonamiento en **Fable**.
**Verificación:** informe con hallazgos priorizados; los críticos/altos corregidos antes de P7/P8.

### P4 — Gate de SEO **[Fable]**
**Meta:** el sitio es indexable y competitivo.
- Metadata, hreflang `/es`+`/en`, sitemap, robots, JSON-LD, OG/Twitter, Core Web Vitals sobre el build de Workers.
- Herramienta: **Semrush MCP** + razonamiento en **Fable**.
**Verificación:** informe SEO con acciones; issues técnicos resueltos.

### P5 — GEO **[Fable]**
**Meta:** los LLMs/chats reconocen la página y su valor, y son más propensos a recomendarla.
- `llms.txt` + `llms-full.txt`; entidad clara y consistente (JSON-LD `Person`/`Organization`/`WebSite` con `sameAs` a perfiles); contenido citable y estructurado (definiciones, FAQ, datos verificables); presencia en fuentes que los modelos indexan.
- **Verificación de reconocimiento:** preguntar a varios chats (Claude/ChatGPT/Gemini/Perplexity) si reconocen y recomiendan el sitio, antes/después.
- Razonamiento en **Fable**; incluye la optimización del perfil de LinkedIn (copy/keywords/entidad) que P7 reutiliza.

### P6 — Corrección de assets / favicon
**Meta:** la imagen de la barra del navegador y los iconos son correctos en todos los contextos.
- `favicon.ico`, `icon` (png/svg), `apple-touch-icon`, `manifest`, y OG image; usando el sistema de app icons de Next 16.
- Basado en hallazgos de P4 (OG/social) y P5 (entidad visual).
**Verificación:** icono correcto en pestaña, marcador, iOS/Android home, y preview social; sin 404 de iconos.

### P7 — Sistema de búsqueda de empleo + dashboard
**Meta:** agregar ofertas de empleo/freelance y gestionarlas en un tablero curado.
- **Agregación (n8n, programado):** Indeed vía **MCP** (`search_jobs`/`get_job_details`/`get_company_data`) + portales freelance (evaluados uno a uno por permiso de API/scraping) → **upsert en Supabase** (nueva tabla `job_listings`, RLS admin-only, patrones existentes).
- **LinkedIn (sin automatizar):** (a) **optimización del perfil** (de P5, [Fable]); (b) ofertas de LinkedIn al tablero vía **alertas oficiales por correo** parseadas, o carga manual. **Sin scraping ni login automatizado.**
- **Dashboard:** nueva sección en el **staff-dash existente** (p. ej. `/admin/empleo`), **Kanban reutilizando el patrón `closer-kanban`** + design system `dash-*`. Estados: `Para aplicar → Aplicado → Respuesta/Entrevista → Cerrado`. El usuario aplica manualmente → la tarjeta pasa a **Aplicado**.
- **Correo:** **Gmail vía MCP** para leer respuestas y actualizar estados. **Proton**: sin API sencilla → Proton Bridge (IMAP, plan de pago), **opcional/diferido** salvo priorización.
- **Modelo:** ejecución Opus/Sonnet; el copy del perfil LinkedIn en Fable (viene de P5).
**Fuera de alcance (explícito):** auto-aplicar, scraping de LinkedIn, manejar contraseñas del usuario (los workflows n8n referencian credenciales que el usuario configura en el credential store de n8n).
**Verificación:** ofertas reales llegan a Supabase; dashboard muestra el Kanban; mover a "Aplicado" persiste; una respuesta de Gmail actualiza el estado.
**Nota:** bloque independiente — puede reordenarse fuera del cutover sin tocar el resto.

### P8 — Deploy / cutover a la cuenta Cloudflare
**Meta:** producción en la cuenta del usuario.
- Desplegar API + front; **DNS cutover** desde Vercel (ventana + TTL bajo); smoke + canary; **plan de rollback** (revertir DNS).
**Verificación:** dominio sirve desde Cloudflare; flujos clave (auth, portal, chat, foro, admin, empleo) verdes; canary sin errores.

## 5. Preocupaciones transversales

- **Secretos:** migrar a `wrangler secret` / Cloudflare (nada de `NEXT_PUBLIC_*` para service-role). Rotar lo pegado en chat (P3).
- **Coste:** requiere **Workers Paid** para Workers AI a volumen, rate-limiting cómodo y OpenNext+R2 (estimación de coste en el plan).
- **Rollback:** cada fase reversible; el cutover P8 revierte por DNS.
- **Dependencias entre fases:** P0→P1→P2 secuencial; P3/P4/P5/P6 dependen de P2 (algo a auditar/optimizar); P7 independiente; P8 al final.

## 6. Decisiones y trade-offs

- **OpenNext → Workers** (no Pages): soporta full Next 16 SSR + `proxy.ts`; a cambio, más setup y riesgo de compatibilidad reciente.
- **Workers AI para chat público, Ollama solo interno**: elimina el cuello y el SPOF del chat; a cambio, coste por token y dependencia de un servicio gestionado.
- **Home server se mantiene** (con Tunnel) para emulador/n8n/IA interna: conserva la "demo" del emulador; a cambio, sigue habiendo un nodo residencial (aceptado, blast radius reducido).
- **LinkedIn sin automatizar**: cero riesgo de baneo/ToS; a cambio, aplicar es manual (por diseño, es un tablero curado).
- **Empleo en Supabase + staff-dash**: máxima reutilización; a cambio, acopla el sistema al proyecto existente (aceptable).

## 7. Ítems a confirmar en el plan (no bloqueantes)

- Dominio exacto y ubicación actual del DNS (¿zona ya en Cloudflare?, registrador).
- Tier de Cloudflare y presupuesto (Workers Paid).
- Modelo de Workers AI para el chat (catálogo).
- Portales freelance concretos y su política de API/scraping.
- Estados finales del Kanban de empleo y si Proton entra en v1.
