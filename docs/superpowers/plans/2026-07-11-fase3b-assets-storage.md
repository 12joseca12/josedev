# Fase 3b — Assets / Supabase Storage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bidirectional file exchange in the client portal (`/area-clientes/assets` + admin surface) backed by a private Supabase Storage bucket with two-layer RLS.

**Architecture:** One `public.client_assets` metadata table (RLS by `client_id`) + one private bucket `client-assets` (RLS on `storage.objects` by path prefix, agreeing with the table via `private.client_id_of(uid)`). Browser uploads directly with the user session; downloads via short-lived signed URLs. An `AFTER INSERT` trigger fires `notify_event` in both directions (Telegram to admin on client upload, Resend to client on admin upload). Follows the Fase 3a pattern end-to-end; Supabase Storage debuts here.

**Tech Stack:** Next.js 16 (App Router, `src/proxy.ts`), React 19, Tailwind 4, Supabase (Postgres + Storage + RLS + `pg_net` + Edge Function `notify`), Jest.

## Global Constraints

- Supabase project ref `nrgrmymsjtgayzejtawa` (auto-pauses ~1wk idle → `restore_project` + poll before migrating).
- SECURITY DEFINER functions live in schema `private`, NEVER `public`; `set search_path = public`; `revoke all ... from public, anon, authenticated`.
- RLS policies use `(select auth.uid())`, never bare `auth.uid()`.
- Migration idiom: enums via `text ... check(...)`; FK columns get a covering index (pre-empt `get_advisors(performance)`).
- Run `get_advisors(security)` AND `get_advisors(performance)` after every migration.
- `jest.mock()` uses RELATIVE paths, never `@/`.
- Services (data access) live in `src/services/*`; pure helpers/constants in `src/lib/*`; DTO types in `src/lib/types.ts`. Service functions return the existing `Result<T>` shape (`{ ok: true, data } | { ok: false }`) — read `src/services/clients-api.ts` for the exact helper.
- Design tokens: `dash-*` only; never reintroduce Material/cyan tokens. Motion gated by reduced-motion; reuse `use-scroll-reveal` if adding reveals.
- RLS/Storage/triggers are NOT Jest-testable → verify live with a throwaway account. Jest covers pure logic only.
- Max file size 25 MB (26214400 bytes); allowed mime types per `ALLOWED_MIME_TYPES` (Task 1). The bucket config is the hard gate; UI validation is UX only.

---

### Task 1: Asset config + pure validators

**Files:**
- Create: `src/lib/assets-config.ts`
- Test: `src/lib/assets-config.test.ts`

**Interfaces:**
- Produces: `MAX_FILE_BYTES: number`, `ALLOWED_MIME_TYPES: readonly string[]`, `isAllowedMime(mime: string): boolean`, `isWithinSize(bytes: number): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/assets-config.test.ts
import { MAX_FILE_BYTES, ALLOWED_MIME_TYPES, isAllowedMime, isWithinSize } from "./assets-config";

describe("assets-config", () => {
  it("caps at 25 MB", () => {
    expect(MAX_FILE_BYTES).toBe(26214400);
  });
  it("accepts allowed mimes and rejects others", () => {
    expect(isAllowedMime("application/pdf")).toBe(true);
    expect(isAllowedMime("image/png")).toBe(true);
    expect(isAllowedMime("application/x-msdownload")).toBe(false);
    expect(isAllowedMime("")).toBe(false);
  });
  it("enforces size bounds (0 < bytes <= max)", () => {
    expect(isWithinSize(1)).toBe(true);
    expect(isWithinSize(MAX_FILE_BYTES)).toBe(true);
    expect(isWithinSize(MAX_FILE_BYTES + 1)).toBe(false);
    expect(isWithinSize(0)).toBe(false);
  });
  it("ALLOWED_MIME_TYPES has no duplicates", () => {
    expect(new Set(ALLOWED_MIME_TYPES).size).toBe(ALLOWED_MIME_TYPES.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- assets-config`
Expected: FAIL — `Cannot find module './assets-config'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/assets-config.ts
/** Hard limits mirrored into the bucket config (see the 3b migration). UI uses
 *  these for early feedback; the bucket + a DB CHECK are the real gates. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 26214400

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
] as const;

const ALLOWED = new Set<string>(ALLOWED_MIME_TYPES);

export function isAllowedMime(mime: string): boolean {
  return ALLOWED.has(mime);
}

export function isWithinSize(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_FILE_BYTES;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- assets-config`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/assets-config.ts src/lib/assets-config.test.ts
git commit -m "feat(3b): asset config + mime/size validators"
```

---

### Task 2: DTO type + pure api helpers (path builder, row mapper)

**Files:**
- Modify: `src/lib/types.ts` (append the asset DTO)
- Create: `src/services/assets-api.ts` (pure helpers this task; Supabase wrappers in Task 3's follow-up are added here too but not Jest-tested — see Task 5)
- Test: `src/services/assets-api.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ClientAssetSource = "client" | "admin"` and `ClientAssetDTO` (in `src/lib/types.ts`).
  - `buildAssetStoragePath(clientId: string, assetId: string): string` → `clients/{clientId}/{assetId}`.
  - `mapAssetRow(row: ClientAssetRow): ClientAssetDTO` where `ClientAssetRow` is the snake_case DB shape.

- [ ] **Step 1: Add the DTO type**

Append to `src/lib/types.ts`:

```ts
export type ClientAssetSource = "client" | "admin";

export type ClientAssetDTO = {
  id: string;
  clientId: string;
  source: ClientAssetSource;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  titulo: string | null;
  descripcion: string | null;
  uploadedByUserId: string | null;
  createdAt: string;
};
```

- [ ] **Step 2: Write the failing test**

```ts
// src/services/assets-api.test.ts
import { buildAssetStoragePath, mapAssetRow } from "./assets-api";

describe("assets-api pure helpers", () => {
  it("builds the client-scoped storage path", () => {
    expect(buildAssetStoragePath("c-1", "a-9")).toBe("clients/c-1/a-9");
  });

  it("maps a snake_case row to the camelCase DTO", () => {
    const row = {
      id: "a-9",
      client_id: "c-1",
      source: "client" as const,
      storage_path: "clients/c-1/a-9",
      file_name: "logo.png",
      mime_type: "image/png",
      size_bytes: 1234,
      titulo: null,
      descripcion: "marca",
      uploaded_by_user_id: "u-1",
      created_at: "2026-07-11T10:00:00Z",
    };
    expect(mapAssetRow(row)).toEqual({
      id: "a-9",
      clientId: "c-1",
      source: "client",
      storagePath: "clients/c-1/a-9",
      fileName: "logo.png",
      mimeType: "image/png",
      sizeBytes: 1234,
      titulo: null,
      descripcion: "marca",
      uploadedByUserId: "u-1",
      createdAt: "2026-07-11T10:00:00Z",
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- assets-api`
Expected: FAIL — `Cannot find module './assets-api'`.

- [ ] **Step 4: Write minimal implementation (pure helpers only)**

```ts
// src/services/assets-api.ts
import type { ClientAssetDTO, ClientAssetSource } from "@/lib/types";

export type ClientAssetRow = {
  id: string;
  client_id: string;
  source: ClientAssetSource;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  titulo: string | null;
  descripcion: string | null;
  uploaded_by_user_id: string | null;
  created_at: string;
};

export function buildAssetStoragePath(clientId: string, assetId: string): string {
  return `clients/${clientId}/${assetId}`;
}

export function mapAssetRow(row: ClientAssetRow): ClientAssetDTO {
  return {
    id: row.id,
    clientId: row.client_id,
    source: row.source,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    titulo: row.titulo,
    descripcion: row.descripcion,
    uploadedByUserId: row.uploaded_by_user_id,
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 5: Run test + typecheck**

Run: `pnpm test -- assets-api && pnpm typecheck`
Expected: PASS, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/services/assets-api.ts src/services/assets-api.test.ts
git commit -m "feat(3b): ClientAssetDTO + pure asset-api helpers"
```

---

### Task 3: Migration — table, helper, two-layer RLS, bucket, trigger

**Files:**
- Create: `supabase/migrations/20260711120000_client_assets.sql`
- Modify: `supabase/functions/notify/index.ts` (route two new event types — read the file first; follow its existing event switch)

**Interfaces:**
- Produces (DB): table `public.client_assets`; function `private.client_id_of(uuid) returns uuid`; bucket `client-assets`; trigger `trg_on_asset_insert`; RLS on `public.client_assets` and `storage.objects`.
- Produces (events): `notify_event('asset.uploaded.client', {...})` and `notify_event('asset.uploaded.admin', {...})`.

> Not Jest-testable. Verified by `apply_migration` + `get_advisors` ×2 + the live checks in Task 6.

- [ ] **Step 1: Ensure the Supabase project is active**

Use the Supabase MCP: if paused, `restore_project` and poll until active. Confirm with `list_tables` (schema `public`).

- [ ] **Step 2: Write the migration file**

```sql
-- supabase/migrations/20260711120000_client_assets.sql
-- Fase 3b — Assets / Storage. Ver docs/superpowers/specs/2026-07-11-fase3b-assets-storage-design.md
-- Helper private.client_id_of + client_assets (RLS por client_id) + bucket privado
-- client-assets (RLS en storage.objects por prefijo de ruta) + trigger notify.

-- 1) Helper: usuario logueado → su clients.id (NULL si no es cliente).
create or replace function private.client_id_of(uid uuid) returns uuid
  language sql security definer set search_path = public stable
as $$ select id from public.clients where user_id = uid limit 1 $$;
revoke all on function private.client_id_of(uuid) from public, anon, authenticated;
grant execute on function private.client_id_of(uuid) to authenticated;

-- 2) Tabla de metadatos (los bytes viven en Storage).
create table if not exists public.client_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  uploaded_by_user_id uuid references auth.users (id) on delete set null,
  source text not null check (source in ('client', 'admin')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  titulo text,
  descripcion text,
  created_at timestamptz not null default now()
);
create index if not exists idx_client_assets_client_id on public.client_assets (client_id);

-- 3) RLS capa 1 — public.client_assets
alter table public.client_assets enable row level security;

drop policy if exists "assets select own or admin" on public.client_assets;
create policy "assets select own or admin" on public.client_assets
  for select to authenticated
  using (
    client_id = private.client_id_of((select auth.uid()))
    or private.staff_role_of((select auth.uid())) = 'admin'
  );

drop policy if exists "assets insert client" on public.client_assets;
create policy "assets insert client" on public.client_assets
  for insert to authenticated
  with check (
    source = 'client'
    and client_id = private.client_id_of((select auth.uid()))
    and uploaded_by_user_id = (select auth.uid())
  );

drop policy if exists "assets insert admin" on public.client_assets;
create policy "assets insert admin" on public.client_assets
  for insert to authenticated
  with check (
    source = 'admin'
    and private.staff_role_of((select auth.uid())) = 'admin'
    and uploaded_by_user_id = (select auth.uid())
  );

drop policy if exists "assets delete own or admin" on public.client_assets;
create policy "assets delete own or admin" on public.client_assets
  for delete to authenticated
  using (
    uploaded_by_user_id = (select auth.uid())
    or private.staff_role_of((select auth.uid())) = 'admin'
  );
-- Sin UPDATE: assets inmutables.

-- 4) Bucket privado + límites (gate duro). Crear ANTES de las policies de storage.objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-assets', 'client-assets', false, 26214400,
  array[
    'image/png','image/jpeg','image/webp','image/gif','image/svg+xml',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','application/zip'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- 5) RLS capa 2 — storage.objects (bucket client-assets). Concuerda con capa 1
--    por (foldername)[2] = client_id. path = clients/{client_id}/{asset_id}.
drop policy if exists "client-assets read own or admin" on storage.objects;
create policy "client-assets read own or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-assets'
    and (
      (
        (storage.foldername(name))[1] = 'clients'
        and (storage.foldername(name))[2] = private.client_id_of((select auth.uid()))::text
      )
      or private.staff_role_of((select auth.uid())) = 'admin'
    )
  );

drop policy if exists "client-assets insert own or admin" on storage.objects;
create policy "client-assets insert own or admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-assets'
    and (
      (
        (storage.foldername(name))[1] = 'clients'
        and (storage.foldername(name))[2] = private.client_id_of((select auth.uid()))::text
      )
      or private.staff_role_of((select auth.uid())) = 'admin'
    )
  );

drop policy if exists "client-assets delete own or admin" on storage.objects;
create policy "client-assets delete own or admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'client-assets'
    and (
      (
        (storage.foldername(name))[1] = 'clients'
        and (storage.foldername(name))[2] = private.client_id_of((select auth.uid()))::text
      )
      or private.staff_role_of((select auth.uid())) = 'admin'
    )
  );

-- 6) Trigger de notificación (best-effort pg_net, mismo patrón que on_comment_insert).
create or replace function private.on_asset_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.source = 'client' then
    perform private.notify_event('asset.uploaded.client',
      jsonb_build_object('client_id', new.client_id, 'asset_id', new.id, 'file_name', new.file_name));
  else
    perform private.notify_event('asset.uploaded.admin',
      jsonb_build_object('client_id', new.client_id, 'asset_id', new.id, 'file_name', new.file_name));
  end if;
  return new;
end;
$$;
revoke all on function private.on_asset_insert() from public, anon, authenticated;

drop trigger if exists trg_on_asset_insert on public.client_assets;
create trigger trg_on_asset_insert
  after insert on public.client_assets
  for each row execute function private.on_asset_insert();
```

- [ ] **Step 3: Apply the migration**

Use Supabase MCP `apply_migration` with name `client_assets` and the SQL above.
Expected: success, no error.

- [ ] **Step 4: Run advisors (both)**

Run `get_advisors(security)` and `get_advisors(performance)`.
Expected: no NEW errors attributable to `client_assets` / the new policies / `client_id_of` (unindexed-FK, RLS-init-plan, security-definer-search-path). Fix any before proceeding.

- [ ] **Step 5: Route the two events in the notify Edge Function**

Read `supabase/functions/notify/index.ts`. Following its existing event handling, add:
- `asset.uploaded.client` → Telegram message to the admin ("Nuevo archivo de cliente: {file_name}"), same channel/helper the existing admin-facing events use.
- `asset.uploaded.admin` → Resend email to the client (look up client email like the existing client-facing event does), subject "Nuevo archivo de JoseCoded".
Keep it best-effort: wrap failures so a missing channel never throws.

Deploy the function (Supabase MCP `deploy_edge_function`, keeping `verify_jwt=false` per its config).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260711120000_client_assets.sql supabase/functions/notify/index.ts
git commit -m "feat(3b): client_assets schema, bucket, two-layer RLS, notify trigger"
```

---

### Task 4: Storage access wrappers in assets-api

**Files:**
- Modify: `src/services/assets-api.ts` (add the Supabase-backed functions)

**Interfaces:**
- Consumes: `buildAssetStoragePath`, `mapAssetRow` (Task 2); the browser Supabase client from `src/lib/supabase/ssr-browser-client.ts` (read `src/services/clients-api.ts` for how it's obtained and the `Result<T>` helper).
- Produces:
  - `listAssets(clientId: string): Promise<Result<ClientAssetDTO[]>>` — select `*` from `client_assets` where `client_id = clientId` order by `created_at desc`, map rows. (RLS returns only what the caller may see; admin passes any clientId.)
  - `uploadAsset(input: { clientId: string; source: ClientAssetSource; file: File; titulo: string | null; descripcion: string | null }): Promise<Result<ClientAssetDTO>>` — generate `assetId = crypto.randomUUID()`, `path = buildAssetStoragePath(clientId, assetId)`, `storage.from("client-assets").upload(path, file)`, then insert the metadata row (`id: assetId`, `storage_path: path`, `file_name: file.name`, `mime_type: file.type`, `size_bytes: file.size`, `uploaded_by_user_id: (await getUser).id`), return `mapAssetRow`. On insert failure, best-effort `storage.remove([path])` to avoid an orphan, then return `{ ok: false }`.
  - `deleteAsset(asset: ClientAssetDTO): Promise<Result<void>>` — `storage.from("client-assets").remove([asset.storagePath])` then delete the row by `id`.
  - `createAssetSignedUrl(storagePath: string): Promise<Result<string>>` — `storage.from("client-assets").createSignedUrl(storagePath, 120)`.

- [ ] **Step 1: Read the reference service**

Read `src/services/clients-api.ts` to copy: how the browser client is created, the `Result<T>` type/helper, and the error-wrapping convention. Mirror them exactly.

- [ ] **Step 2: Implement the four wrappers**

Append to `src/services/assets-api.ts`, using the same client + `Result` helper as `clients-api.ts`. Enforce nothing security-relevant here (RLS does that); this layer is ergonomics. Validate mime/size with `isAllowedMime`/`isWithinSize` (from `@/lib/assets-config`) before upload for early failure, returning `{ ok: false }` if invalid.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/services/assets-api.ts
git commit -m "feat(3b): asset-api storage wrappers (upload/list/delete/signed-url)"
```

---

### Task 5: Client UI — `/area-clientes/assets`

**Files:**
- Create: `src/components/client-portal/use-my-assets.ts`
- Create: `src/components/client-portal/assets-client.tsx`
- Create: `src/app/[locale]/area-clientes/assets/page.tsx`
- Modify: `src/components/client-portal/client-shell.tsx` (add the "Assets" nav link)
- Modify: `src/services/literals` source (add the screen literals used below — read how `screens.*` keys are defined and add `screens.assets.*` for es+en)

**Interfaces:**
- Consumes: `useMyAssets` (this task), `listAssets`/`uploadAsset`/`deleteAsset`/`createAssetSignedUrl` (Task 4), `getMyProject` (existing, from `@/services/clients-api`), `ClientAssetDTO`.
- Produces: the route + `useMyAssets()` returning `{ state, reload }` mirroring `useMyTasks`.

- [ ] **Step 1: Write the hook (mirror `use-my-tasks.ts`)**

```ts
// src/components/client-portal/use-my-assets.ts
"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClientAssetDTO } from "@/lib/types";
import { getMyProject } from "@/services/clients-api";
import { listAssets } from "@/services/assets-api";

type MyAssetsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-client" }
  | { status: "ready"; clientId: string; assets: ClientAssetDTO[] };

async function fetchMyAssets(): Promise<MyAssetsState> {
  const projectResult = await getMyProject();
  if (!projectResult.ok) return { status: "error" };
  const client = projectResult.data;
  if (!client) return { status: "no-client" };
  const assetsResult = await listAssets(client.id);
  if (!assetsResult.ok) return { status: "error" };
  return { status: "ready", clientId: client.id, assets: assetsResult.data };
}

export function useMyAssets() {
  const [state, setState] = useState<MyAssetsState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await fetchMyAssets();
      if (mounted) setState(next);
    })();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);
  return { state, reload };
}
```

- [ ] **Step 2: Write `assets-client.tsx`**

Read `src/components/client-portal/tareas-client.tsx` for the shell/loading/error/empty conventions and literal usage, then build `AssetsClient`:
- Renders `useMyAssets().state` (loading / error / no-client / ready).
- Ready: an upload zone (`<input type="file">` + optional `titulo`/`descripcion` inputs) that on submit validates with `isAllowedMime`/`isWithinSize` (from `@/lib/assets-config`), calls `uploadAsset({ clientId, source: "client", file, titulo, descripcion })`, then `reload()`; a list ordered `createdAt desc`, each row showing `fileName`, size, a "Subido por vos"/"Subido por JoseCoded" label from `source`, a download button (`createAssetSignedUrl` → `window.open(url)`), and a delete button shown only when `source === "client"` (calls `deleteAsset` → `reload()`).
- Styling: `dash-*` tokens only; reuse the card/list classes from `tareas-client.tsx`. Disable the upload button while a request is in flight.

- [ ] **Step 3: Write the page**

```tsx
// src/app/[locale]/area-clientes/assets/page.tsx
import { AssetsClient } from "@/components/client-portal/assets-client";
import { resolveLocaleParam } from "@/services/literals";

type PageProps = { params: Promise<{ locale: string }> };

export default async function AssetsPage({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <AssetsClient locale={locale} />;
}
```
(Gating is already handled by `proxy.ts`/`resolveClientAccess` for all `/area-clientes/*`. Match the exact prop shape `tareas/page.tsx` passes to its client component — read it and align.)

- [ ] **Step 4: Add the nav link**

In `src/components/client-portal/client-shell.tsx`, add an "Assets" entry to the portal nav pointing to `/${locale}/area-clientes/assets`, following the existing links (pack/proyecto/tareas). Add the `screens.assets.navLabel` literal (es: "Archivos", en: "Files").

- [ ] **Step 5: Verify build + live**

Run: `pnpm build`
Expected: BUILD passes, 45/45 pages (the new route prerenders/segments cleanly).
Then live: `pnpm start`, log in as a client, open `/area-clientes/assets`, upload a small PNG, confirm it lists and downloads. (Full RLS/notify matrix is Task 6.)

- [ ] **Step 6: Commit**

```bash
git add src/components/client-portal/use-my-assets.ts src/components/client-portal/assets-client.tsx "src/app/[locale]/area-clientes/assets/page.tsx" src/components/client-portal/client-shell.tsx src/services/literals*
git commit -m "feat(3b): client assets page + upload/download/delete UI"
```

---

### Task 6: Admin surface + end-to-end live verification

**Files:**
- Modify: `src/components/staff-dash/admin-cliente-detail-client.tsx` (add an "Assets" section)
- Modify: `src/components/staff-dash/use-admin-client-detail.ts` (fetch the client's assets)

**Interfaces:**
- Consumes: `listAssets`, `uploadAsset` (with `source: "admin"`), `deleteAsset`, `createAssetSignedUrl`, `ClientAssetDTO`.

- [ ] **Step 1: Fetch assets in the admin hook**

In `use-admin-client-detail.ts`, add `listAssets(clientId)` to the client-detail load (alongside tasks/comments), exposing `assets: ClientAssetDTO[]` and a `reloadAssets`/existing reload path. Read the file and mirror its existing fetch shape.

- [ ] **Step 2: Render the admin Assets section**

In `admin-cliente-detail-client.tsx`, add an "Assets" section: list all `assets` (both sources labelled), an upload control that calls `uploadAsset({ clientId, source: "admin", file, titulo, descripcion })` then reloads, download via `createAssetSignedUrl`, and delete on any asset (admin can delete all). Reuse the section styling already in the file; `dash-*` tokens only.

- [ ] **Step 3: Typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: clean, build passes.

- [ ] **Step 4: End-to-end live verification (the ADR's live layer)**

With `pnpm start` and two throwaway accounts (one client with a `clients` row, one admin), verify:
1. Client uploads → row appears in `/area-clientes/assets` AND in `/admin/clientes/[id]`; admin gets a Telegram message.
2. Admin uploads (`source='admin'`) → appears in the client's `/area-clientes/assets`; client gets a Resend email (email may be pending domain verification — confirm the event fired via logs if the mail doesn't arrive).
3. Signed URL downloads the correct file and 404s after ~120 s.
4. **Isolation:** a second client account CANNOT list or download the first client's assets (RLS layer 1 + 2). Try fetching another client's path directly → denied.
5. Client can delete own upload; client CANNOT delete an admin-uploaded asset (delete button hidden AND the API call denied by RLS).
6. Oversized (>25 MB) or disallowed-mime upload is rejected by the bucket even if the UI check is bypassed.

- [ ] **Step 5: Re-run advisors**

`get_advisors(security)` + `get_advisors(performance)` once more after any policy tweak from Step 4.
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/staff-dash/admin-cliente-detail-client.tsx src/components/staff-dash/use-admin-client-detail.ts
git commit -m "feat(3b): admin assets section + e2e live verification"
```

---

## Notes for the executor
- Bucket creation via SQL (`insert into storage.buckets ...`) is the migration-friendly path; if the project restricts direct `storage.buckets` inserts, create the bucket via the Supabase dashboard/MCP with identical settings, then apply only the policy portion.
- `storage.foldername(name)` returns the folder tokens (excluding the filename), so `[1]='clients'`, `[2]='{client_id}'` for path `clients/{client_id}/{asset_id}`. Verify with one live upload before trusting the RLS.
- Orphan cleanup (upload ok / insert fail, or row deleted / object not) is deliberately out of 3b — a later admin utility. `uploadAsset` already best-effort-removes on insert failure.
