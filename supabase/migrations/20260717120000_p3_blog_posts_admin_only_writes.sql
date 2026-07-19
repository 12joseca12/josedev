-- P3 security fix (H3): blog_posts INSERT/UPDATE/DELETE were open to ANY authenticated
-- user (only auth.uid()=author_id), so any self-registered account could publish arbitrary
-- public blog posts (defacement). Restrict writes to admin. SELECT (public read of
-- published posts) is unchanged. Applied to prod via Supabase MCP.

drop policy if exists blog_posts_insert on public.blog_posts;
create policy blog_posts_insert on public.blog_posts for insert to authenticated
  with check (private.staff_role_of((select auth.uid())) = 'admin');

drop policy if exists blog_posts_update on public.blog_posts;
create policy blog_posts_update on public.blog_posts for update to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');

drop policy if exists blog_posts_delete on public.blog_posts;
create policy blog_posts_delete on public.blog_posts for delete to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin');
