# TODOS

Deferred work captured during planning/review, with enough context to pick up later without re-deriving the reasoning.

## MFA reset UI for closers

**What:** Button in `/admin/closers` to force TOTP re-enrollment for a closer who lost their MFA device.

**Why:** Without it, the only recovery path is the Supabase Dashboard/Admin API directly — works, but leaves no audit trail inside the app of when/why a closer's MFA was reset.

**Pros:** Better operational UX, in-app traceability of security-sensitive resets.

**Cons:** Effort spent on an edge case that may not occur for months. Deferred deliberately (see 2026-07-04 `/plan-eng-review` for the auth/roles layer) in favor of shipping the core auth system first.

**Context:** Surfaced during the architecture review for josedev's Auth/Roles/MFA layer. Admin and closer accounts require TOTP (Supabase Auth native) with no automated backup-codes flow. For the admin's own lost-device case, the accepted answer is manual break-glass via the Supabase Dashboard directly (never building in-app UI for that specific case). This TODO is only for the closer-facing reset flow.

**Depends on:** Issue 7 (shared admin/closer onboarding flow — password change + MFA enrollment) landing first, and at least one real closer account existing to justify building it.

**Source:** `2026-07-04-full-site-redesign-design-v1.md` design doc, Auth/Roles/MFA architecture review (`/plan-eng-review`).

## Performance-weighted lead auto-distribution

**What:** Replace the MVP round-robin/manual lead assignment with an algorithm that distributes unassigned leads proportionally to each closer's performance ratio (leads taken vs. leads closed) — better-converting closers get a bigger share of new leads automatically.

**Why:** Deferred because with only 1-3 closers and low lead volume at launch, a ratio-based formula has too little data to be statistically meaningful (a closer with 1 closed out of 2 taken looks identical to one with 50/100 — same ratio, wildly different confidence). Building the sophisticated version now would mean designing and testing an algorithm against data that doesn't exist yet.

**Pros:** Rewards top performers with more opportunity automatically, removes manual admin effort in lead routing once there's a real team.

**Cons:** Needs a minimum sample size per closer to be fair/meaningful (undefined threshold — needs a decision when revisited). Risk of feedback loops (a closer who gets lucky early keeps getting more leads, compounding an early fluke) unless smoothed (e.g., Bayesian prior / minimum-leads floor before ratio kicks in).

**Context:** Surfaced during the Leads/CRM architecture review (`/plan-eng-review`, 2026-07-04). MVP ships with round-robin (2+ closers) or direct auto-assign (1 closer), plus a "take this lead" button for the shared unassigned pool and a "take from another closer" transfer action (both logged in `lead_assignments` for audit/commission-dispute purposes). Revisit once there's enough real closer/lead volume (a few months of data, several closers) to make a ratio-based formula meaningful.

**Depends on:** `leads` and `lead_assignments` tables existing with real historical data; `staff_members.comision` (commission rate) already in place.

**Source:** `2026-07-04-full-site-redesign-design-v1.md` design doc, Leads/CRM architecture review (`/plan-eng-review`).

## Enable Supabase Auth dashboard-only security settings

**What:** Two settings flagged by `get_advisors` that have no MCP/API tool to set programmatically — must be toggled manually in the Supabase Dashboard for project `josecoded` (`nrgrmymsjtgayzejtawa`):
1. **Leaked Password Protection** (Authentication → Policies) — checks new passwords against HaveIBeenPwned.
2. **Rate limiting on the staff login** — Supabase Auth has native rate-limiting; confirm it's configured tightly enough for `/staff/login` specifically (this was Issue 9 in the Auth/Roles/MFA architecture review, the real gap the outside-voice review caught).

**Why:** Both are cheap, real security controls (not theater) directly relevant to the staff auth surface that now handles real login attempts. Deferred only because no Supabase MCP tool exposes Auth config — this needs a human in the dashboard.

**Context:** Found while applying the Layer 1 migration (2026-07-04) — `get_advisors(type="security")` flagged leaked-password-protection as disabled; rate-limiting was the architecture review's Issue 9 and was never confirmed enabled post-implementation.

**Source:** Layer 1 (Auth/Roles/MFA) implementation, 2026-07-04.

## Fase 3a — follow-ups (post-implementación)

Surgieron durante la implementación/review de la Fase 3a (Client Portal). Ninguno bloquea; se difirieron con criterio.

### Endurecer la policy INSERT de comentarios (bind task_id → client_id)
**What:** La policy `insert comments` de `client_task_comments` valida `client_id` propio + `author_user_id` + `internal=false`, pero NO valida que el `task_id` pertenezca a ese `client_id`.
**Why:** Impacto contenido (la fila lleva el `client_id` del propio cliente, el SELECT está scopeado por `client_id`, no hay fuga cross-cliente) — peor caso: una referencia `task_id` colgante auto-infligida, invisible para otros. Aun así es sloppy.
**How:** Agregar a la rama del cliente `and (task_id is null or task_id in (select id from public.client_tasks where client_id in (select id from public.clients where user_id=(select auth.uid()))))`. Migración chica + `get_advisors`.
**Source:** Review final whole-branch (opus), 2026-07-06, hallazgo M2.

### Verificar dominio en Resend (SPF/DKIM) para el email al cliente
**What:** El path de email al cliente (evento `comment.admin` → Resend) necesita `josedev.com` verificado en Resend (registros SPF/DKIM en el DNS).
**Why:** Sin verificar, los mails salen como no-verificados o rebotan. El Telegram de ops ya anda sin esto; solo afecta el mail al cliente.
**How:** Resend → Domains → agregar josedev.com → poner los registros que da en el DNS. Después probar el evento `comment.admin` end-to-end.
**Source:** Fase 3a notificaciones, 2026-07-06.

### Limpiezas menores de Fase 3a
**What:** (a) doble `getUser()` en el path de redirect del guard client-area de `proxy.ts` (correcto, un round-trip redundante en el path no-cliente); (b) el componente admin importa las server actions desde el folder de ruta dinámica `[id]` (válido, forma inusual); (c) catálogo de packs solo soft-delete (`activo`), sin hard-delete; (d) fallback muerto `?? phase` en `phases.ts` (`phaseLabel`).
**Why:** Todos cosméticos/no-bloqueantes, flagueados por los reviews. Agrupados para una pasada de limpieza futura.
**Source:** Reviews de tarea + whole-branch de Fase 3a, 2026-07-06.

### Pre-existentes que bloquean `next build` (no son de 3a)
**What:** `next build` (export estático) falla en dos puntos NO relacionados con 3a: (a) `/foro/new` hace un fetch build-time a una IP de LAN; (b) la home `(site)/page` usa `useSearchParams` sin `Suspense` boundary.
**Why:** Bloquean un build de producción / deploy. Confirmados pre-existentes (reproducidos en el árbol sin tocar). Hay que arreglarlos antes de deployar (envolver en Suspense la home; hacer el fetch de /foro/new resiliente o client-side).
**Source:** Detectados durante los builds de verificación de Fase 3a, 2026-07-06.
