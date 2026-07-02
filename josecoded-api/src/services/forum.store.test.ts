import type { Env } from '../types/env.types';
import { forumUsesDatabase } from './forum.store';

const base: Pick<
  Env,
  'API_MODE' | 'WORKER_URL' | 'WORKER_INTERNAL_TOKEN' | 'CORS_ORIGINS' | 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'
> = {
  API_MODE: 'development',
  WORKER_URL: 'https://a.example',
  WORKER_INTERNAL_TOKEN: '12345678901234567890',
  CORS_ORIGINS: '',
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: '12345678901234567890',
};

test('forumUsesDatabase: true con service role y sin opt-out', () => {
  const env = {
    ...base,
    SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(25),
  } as Env;
  expect(forumUsesDatabase(env)).toBe(true);
});

test('forumUsesDatabase: false sin service role', () => {
  expect(forumUsesDatabase(base as Env)).toBe(false);
});

test('forumUsesDatabase: false con FORUM_USE_MOCK=true aunque haya service role', () => {
  const env = {
    ...base,
    SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(25),
    FORUM_USE_MOCK: 'true',
  } as Env;
  expect(forumUsesDatabase(env)).toBe(false);
});

test('forumUsesDatabase: false con FORUM_USE_DATABASE=false aunque haya service role', () => {
  const env = {
    ...base,
    SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(25),
    FORUM_USE_DATABASE: 'false',
  } as Env;
  expect(forumUsesDatabase(env)).toBe(false);
});
