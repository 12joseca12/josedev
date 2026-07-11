# Fase 3b — Assets / Supabase Storage (`/area-clientes/assets`) — Design Spec

Fecha: 2026-07-11 · Estado: aprobado (brainstorming) · Depende de: Fase 3a (`clients`, portal, notify) mergeada.

## Contexto y descomposición

Sección de intercambio de archivos **bidireccional** dentro del portal de cliente: el cliente sube materiales que aporta al proyecto (logos, textos, fotos, marca) y el admin sube directrices/entregables (guías, mockups, brandbooks, archivos finales). Ambas direcciones comparten un único modelo: **archivo + nota (título/descripción opcional)**.

Es la **primera** vez que el proyecto usa Supabase Storage (grep confirmó 0 usos de `storage.from`/`.upload` en `src`). Todo lo demás reusa el patrón de 3a: tablas `public.*` con RLS por `client_id`, helpers SECURITY DEFINER en `private`, trigger → `notify_event`, componentes en `client-portal/` + `staff-dash/`, verificación en 3 capas.

Alcance de un solo spec/plan. No se descompone.

## Sección A — Modelo de datos

### Tabla `public.client_assets`
```sql
create table if not exists public.client_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  uploaded_by_user_id uuid references auth.users (id) on delete set null,
  source text not null check (source in ('client', 'admin')),  -- dirección del archivo
  storage_path text not null unique,                            -- clients/{client_id}/{id}
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  titulo text,
  descripcion text,
  created_at timestamptz not null default now()
);
create index if not exists idx_client_assets_client_id on public.client_assets (client_id);
```
Sin `updated_at` (los assets son inmutables una vez subidos; editar = borrar + resubir). Sin categorías/carpetas/versionado (YAGNI).

### Bucket de Storage
- Bucket **privado** `client-assets` (creado por migración vía `storage.create_bucket` o config; `public = false`).
- `file_size_limit`: 26214400 (25 MB) — **gate duro a nivel bucket**.
- `allowed_mime_types`: imágenes comunes (`image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`), `application/pdf`, docs ofimáticos comunes (`application/msword`, `application/vnd.openxmlformats-officedocument.*`), `text/plain`, `application/zip`. (Lista final ajustable en implementación.)
- Convención de ruta: `clients/{client_id}/{asset_id}` — el `asset_id` (uuid generado en cliente) es la key, evita colisiones de nombre. El `file_name` original se guarda en la fila.

### Patrones aplicados (del ADR)
Nullable-FK en `uploaded_by_user_id` (audit sin romper si se borra el user). FK-index pre-empt de `get_advisors(performance)`. RLS self-ref → SECURITY DEFINER → `private`. `(select auth.uid())` en toda policy. UI no duplica validación de DB (los límites viven en el bucket + CHECK).

## Sección B — Helper, RLS (dos capas) y trigger

### Helper SECURITY DEFINER (schema `private`)
```sql
-- Mapea el usuario logueado a su fila clients. NULL si no es cliente.
create or replace function private.client_id_of(uid uuid) returns uuid
  language sql security definer set search_path = public stable
as $$ select id from public.clients where user_id = uid limit 1 $$;
revoke all on function private.client_id_of(uuid) from public;
grant execute on function private.client_id_of(uuid) to authenticated;
```
(Convive con los helpers existentes `staff_role_of`, `is_staff_member`.)

### RLS capa 1 — `public.client_assets`
- **SELECT**: `client_id = private.client_id_of((select auth.uid()))` OR `private.staff_role_of((select auth.uid())) = 'admin'`.
- **INSERT (cliente)**: `with check` bindea `client_id = private.client_id_of(uid)` AND `source = 'client'` AND `uploaded_by_user_id = uid`.
- **INSERT (admin)**: `with check` `staff_role_of = 'admin'` AND `source = 'admin'` (client_id libre; admin sube a cualquier cliente).
- **DELETE**: `uploaded_by_user_id = uid` (dueño borra lo suyo) OR `staff_role_of = 'admin'`.
- Sin UPDATE (assets inmutables).

### RLS capa 2 — `storage.objects` (bucket `client-assets`)
Las policies deben **concordar** con la capa 1 por `client_id` = primer segmento tras `clients/` de `storage.path_tokens`. Para `bucket_id = 'client-assets'`:
- **SELECT / INSERT / DELETE**: `(storage.foldername(name))[1] = 'clients'` AND `(storage.foldername(name))[2] = private.client_id_of((select auth.uid()))::text` OR `staff_role_of = 'admin'`.
- Descarga siempre por **signed URL** (`createSignedUrl`, ~120 s); nunca URL pública.

### Trigger de notificación
```sql
-- private.on_asset_insert() AFTER INSERT on client_assets → notify_event(...)
--   source='client' → evento Telegram (admin)
--   source='admin'  → evento Resend (email al cliente)
```
Mismo patrón best-effort `pg_net` que `on_comment_insert`. SECURITY DEFINER en `private`. `get_advisors` ×2 después de la migración.

## Sección C — Flujo de subida/descarga/borrado

- **Subir (approach A, directo desde el navegador):**
  1. Cliente elige archivo; se valida mime+size en UI (feedback temprano; el bucket es el gate real).
  2. Se genera `assetId` (uuid) en cliente.
  3. `supabase.storage.from('client-assets').upload('clients/{client_id}/{assetId}', file)` con la sesión del usuario (RLS capa 2 autoriza).
  4. Insert de la fila `client_assets` con `storage_path`, `file_name`, `mime_type`, `size_bytes`, `source`, `titulo/descripcion` (RLS capa 1 autoriza).
  - **Orden y huérfanos:** upload primero, insert después. Si el insert falla, el objeto queda huérfano en Storage (sin fila). Riesgo menor aceptado: acción admin de limpieza puntual (lista objetos sin fila) — NO en el hot path de 3b. Documentado en failure modes.
  - Admin sube igual desde `/admin/clientes/[id]` con `source='admin'`.
- **Descargar:** on-click → `createSignedUrl(path, 120)` → abrir/descargar.
- **Borrar:** dueño (o admin) → borra objeto de Storage + fila (dos ops; si la fila se borra y el objeto no, queda huérfano → misma limpieza).

## Sección D — UI, rutas, verificación

### Ruta cliente
`src/app/[locale]/area-clientes/assets/page.tsx` — nueva, gateada por tener fila `clients` (igual que el resto de `/area-clientes/*`, ya cubierto por `proxy.ts`/`resolveClientAccess`). Añadir link en la nav del `client-shell`.
- Componente `assets-client.tsx` (patrón `tareas-client.tsx`): lista unificada ordenada por `created_at desc`, cada ítem etiqueta la dirección ("Subido por vos" / "Subido por JoseCoded" según `source`), botón descargar, botón borrar si es propio. Zona de subida (input file + drag/drop) con título/descripción opcionales.
- Hook `use-my-assets.ts` (patrón `use-my-tasks.ts`): fetch + `reloadKey`.

### Ruta admin
Sección "Assets" dentro de `admin-cliente-detail-client.tsx` (`/admin/clientes/[id]`): ve todos los assets del cliente, sube directrices (`source='admin'`), borra cualquiera. Reusa `use-admin-client-detail.ts`.

### Capa de servicios
`src/lib/assets-api.ts` (patrón `leads-api.ts`): helpers puros y de acceso — constructor de ruta `clients/{client_id}/{id}`, validadores `isAllowedMime`/`isWithinSize`, mapeador fila→viewmodel, wrappers de upload/list/delete/signed-url.

### Constantes
`src/lib/assets-config.ts`: `ALLOWED_MIME_TYPES`, `MAX_FILE_BYTES` (25 MB) — fuente única compartida por UI y (documentalmente) por la config del bucket.

### Verificación (las 3 capas del ADR)
1. **Jest** (lo que es testeable): `assets-api` helpers puros — path builder, validadores mime/size, mapeador. `jest.mock()` con rutas relativas.
2. **Vivo con cuenta descartable**: subir como cliente → aparece en `/admin/clientes/[id]` + Telegram; subir como admin → aparece en `/area-clientes/assets` + email; probar signed URL caduca; probar que un cliente NO ve/descarga assets de otro (RLS capa 1 y 2); borrar propio; intentar borrar ajeno (rechazado).
3. **`get_advisors(security)` + `(performance)`** después de cada migración.

## Fuera de alcance de 3b (YAGNI)
Versionado de archivos, carpetas/categorías, thumbnails/preview inline, descarga masiva en zip, escaneo antivirus, edición de metadatos post-subida, cuotas por cliente. Storage free tier 1GB sin backups → subir a Pro cuando se acumulen archivos (operativo, no bloquea 3b).

## Prerrequisitos operativos
- Proyecto Supabase activo (auto-pausa ~1sem idle → `restore_project` + poll antes de migrar).
- Crear el bucket `client-assets` (migración o dashboard) con `public=false` + límites, ANTES de las policies de `storage.objects`.
- Respaldar el ADR antes de cualquier `index_repository`.

## Qué ya existe (reuso verificado contra el código)
- `clients` (con `user_id`), portal `/area-clientes/*` gateado, `client-shell`, patrón `tareas-client`/`use-my-tasks`/`comment-thread`, `admin-cliente-detail`, Edge Function `notify` + `notify_event` + Telegram (live) + Resend (dominio pendiente), helpers `private.staff_role_of`/`is_staff_member`, idiom de migración (SECURITY DEFINER `private`, RLS `(select auth.uid())`, FK-index).

## Failure modes de los codepaths nuevos
- **Objeto huérfano** (upload OK, insert falla / borrado de fila sin objeto): sin fuga (RLS sigue aplicando por ruta), pero ocupa cuota. Mitigación: acción admin de limpieza puntual (post-3b).
- **Desajuste entre las dos capas de RLS**: si `client_id_of` devuelve NULL (user no-cliente) las policies deniegan por diseño (fail-closed). Test en vivo: staff sin fila `clients` no puede subir como cliente.
- **`pg_net` best-effort**: notificación puede perderse sin romper el insert (igual que 3a). El asset queda visible al entrar aunque falle el aviso.
- **Signed URL filtrada**: caduca en ~120 s; ventana mínima. No se exponen URLs públicas.
- **mime/size burlando la UI**: el gate real es el bucket (`file_size_limit`/`allowed_mime_types`) + CHECK `size_bytes>0`; la validación UI es solo UX.
