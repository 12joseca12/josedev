-- Foro: tablas, índices, búsqueda (FTS simple) y RLS.
-- El worker josecoded-api usa service_role para escrituras; RLS limita anon/authenticated a lectura.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.forum_thematics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_display text not null,
  description_display text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_entries (
  id uuid primary key default gen_random_uuid(),
  thematic_id uuid not null references public.forum_thematics (id) on delete cascade,
  slug text not null,
  parent_entry_id uuid references public.forum_entries (id) on delete set null,
  branch_from_comment_id uuid,
  title_display text not null,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_display text not null,
  created_at timestamptz not null default now(),
  unique (thematic_id, slug)
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.forum_entries (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_display text not null,
  parent_comment_id uuid references public.forum_comments (id) on delete set null,
  is_entry_seed boolean not null default false,
  segments jsonb not null default '[]'::jsonb,
  like_count integer not null default 0,
  useful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_comments_segments_is_array check (jsonb_typeof(segments) = 'array')
);

alter table public.forum_entries
  drop constraint if exists forum_entries_branch_from_comment_id_fkey;

alter table public.forum_entries
  add constraint forum_entries_branch_from_comment_id_fkey
  foreign key (branch_from_comment_id) references public.forum_comments (id) on delete set null;

create table if not exists public.forum_comment_likes (
  comment_id uuid not null references public.forum_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.forum_comment_useful (
  comment_id uuid not null references public.forum_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ---------------------------------------------------------------------------
-- FTS por entrada
-- ---------------------------------------------------------------------------

create table if not exists public.forum_entry_search (
  entry_id uuid primary key references public.forum_entries (id) on delete cascade,
  document tsvector not null
);

create or replace function public.forum_entry_search_refresh(p_entry_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  base text;
  seg text;
begin
  select title_display into base from public.forum_entries where id = p_entry_id;
  select string_agg(sc, ' ') into seg
  from (
    select c.segments::text as sc from public.forum_comments c where c.entry_id = p_entry_id
  ) q;
  insert into public.forum_entry_search (entry_id, document)
  values (p_entry_id, to_tsvector('simple', coalesce(base, '') || ' ' || coalesce(seg, '')))
  on conflict (entry_id) do update
  set document = excluded.document;
end;
$$;

create or replace function public.forum_trg_comments_search()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.forum_entry_search_refresh(old.entry_id);
    return old;
  end if;
  perform public.forum_entry_search_refresh(new.entry_id);
  return new;
end;
$$;

drop trigger if exists forum_comments_search_aiud on public.forum_comments;
create trigger forum_comments_search_aiud
after insert or update or delete on public.forum_comments
for each row execute function public.forum_trg_comments_search();

create or replace function public.forum_trg_entries_search()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.forum_entry_search_refresh(new.id);
  return new;
end;
$$;

drop trigger if exists forum_entries_search_aiu on public.forum_entries;
create trigger forum_entries_search_aiu
after insert or update of title_display on public.forum_entries
for each row execute function public.forum_trg_entries_search();

create index if not exists forum_entry_search_document_gin on public.forum_entry_search using gin (document);

create index if not exists forum_entries_thematic_parent_created_idx
  on public.forum_entries (thematic_id, parent_entry_id, created_at desc);

create index if not exists forum_comments_entry_idx on public.forum_comments (entry_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.forum_thematics enable row level security;
alter table public.forum_entries enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_comment_likes enable row level security;
alter table public.forum_comment_useful enable row level security;
alter table public.forum_entry_search enable row level security;

drop policy if exists forum_thematics_select_all on public.forum_thematics;
create policy forum_thematics_select_all on public.forum_thematics for select to anon, authenticated using (true);

drop policy if exists forum_entries_select_all on public.forum_entries;
create policy forum_entries_select_all on public.forum_entries for select to anon, authenticated using (true);

drop policy if exists forum_comments_select_all on public.forum_comments;
create policy forum_comments_select_all on public.forum_comments for select to anon, authenticated using (true);

drop policy if exists forum_entry_search_select_all on public.forum_entry_search;
create policy forum_entry_search_select_all on public.forum_entry_search for select to anon, authenticated using (true);

drop policy if exists forum_likes_select_all on public.forum_comment_likes;
create policy forum_likes_select_all on public.forum_comment_likes for select to anon, authenticated using (true);

drop policy if exists forum_useful_select_all on public.forum_comment_useful;
create policy forum_useful_select_all on public.forum_comment_useful for select to anon, authenticated using (true);

drop policy if exists forum_thematics_no_ins on public.forum_thematics;
create policy forum_thematics_no_ins on public.forum_thematics for insert to anon, authenticated with check (false);

drop policy if exists forum_entries_no_ins on public.forum_entries;
create policy forum_entries_no_ins on public.forum_entries for insert to anon, authenticated with check (false);

drop policy if exists forum_comments_no_ins on public.forum_comments;
create policy forum_comments_no_ins on public.forum_comments for insert to anon, authenticated with check (false);

grant select on public.forum_thematics to anon, authenticated;
grant select on public.forum_entries to anon, authenticated;
grant select on public.forum_comments to anon, authenticated;
grant select on public.forum_entry_search to anon, authenticated;
grant select on public.forum_comment_likes to anon, authenticated;
grant select on public.forum_comment_useful to anon, authenticated;

grant all on public.forum_thematics to service_role;
grant all on public.forum_entries to service_role;
grant all on public.forum_comments to service_role;
grant all on public.forum_entry_search to service_role;
grant all on public.forum_comment_likes to service_role;
grant all on public.forum_comment_useful to service_role;

grant execute on function public.forum_entry_search_refresh(uuid) to service_role;
