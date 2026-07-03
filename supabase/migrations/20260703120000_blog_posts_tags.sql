-- Blog: tags para categorización y posts relacionados.

alter table public.blog_posts
  add column if not exists tags text[] not null default '{}';

create index if not exists blog_posts_tags_gin_idx
  on public.blog_posts using gin (tags);

comment on column public.blog_posts.tags is 'Etiquetas libres para filtrado y cálculo de posts relacionados (overlap con &&).';
