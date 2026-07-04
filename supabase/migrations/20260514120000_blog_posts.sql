-- Blog: artículos en Markdown, borradores y RLS (lectura pública solo publicados).

create extension if not exists "pgcrypto";

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  locale text not null check (locale in ('es', 'en')),
  title text not null,
  excerpt text,
  body_md text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (locale, slug),
  constraint blog_posts_published_consistency check (
    (status = 'published' and published_at is not null)
    or (status = 'draft')
  )
);

create index if not exists blog_posts_list_published_idx
  on public.blog_posts (locale, status, published_at desc);

comment on table public.blog_posts is 'Artículos del blog; borradores visibles solo para el autor vía RLS.';

create or replace function public.blog_posts_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists blog_posts_bu_touch on public.blog_posts;
create trigger blog_posts_bu_touch
before update on public.blog_posts
for each row execute function public.blog_posts_touch_updated_at();

alter table public.blog_posts enable row level security;

drop policy if exists blog_posts_select on public.blog_posts;
create policy blog_posts_select on public.blog_posts
  for select
  to anon, authenticated
  using (
    (status = 'published' and published_at is not null)
    or (auth.uid() is not null and author_id = auth.uid())
  );

drop policy if exists blog_posts_insert on public.blog_posts;
create policy blog_posts_insert on public.blog_posts
  for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists blog_posts_update on public.blog_posts;
create policy blog_posts_update on public.blog_posts
  for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists blog_posts_delete on public.blog_posts;
create policy blog_posts_delete on public.blog_posts
  for delete
  to authenticated
  using (auth.uid() = author_id);

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;
grant all on public.blog_posts to service_role;

-- Semillas de ejemplo (solo lectura pública; sin autor).
insert into public.blog_posts (slug, locale, title, excerpt, body_md, status, author_id, published_at)
values
(
  'bienvenida-al-blog',
  'es',
  'Bienvenida al blog',
  'Cómo publicamos notas técnicas y enlaces con el resto del sitio.',
  $md$# Bienvenida

Este espacio reúne **artículos** y notas breves. El contenido se sirve desde **Supabase** con filas `published`; los borradores quedan ocultos para visitantes.

## Próximos pasos

- Panel de edición (autenticado) cuando lo definamos en producto.
- RSS y `hreflang` cuando haya versiones paralelas por idioma.
$md$,
  'published',
  null,
  now()
),
(
  'welcome-to-the-blog',
  'en',
  'Welcome to the blog',
  'How we publish technical notes and connect them to the rest of the site.',
  $md$# Welcome

This section collects **articles** and short notes. Content is loaded from **Supabase** using `published` rows; **drafts** stay hidden from anonymous visitors.

## Next steps

- Authoring UI (authenticated) when product defines it.
- RSS and `hreflang` when we ship parallel locales.
$md$,
  'published',
  null,
  now()
)
on conflict (locale, slug) do nothing;
