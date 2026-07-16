import { resolveAiChatTimeoutMs } from './ai-timeout';
import type { Env } from '../types/env.types';

const base = {} as Env;

describe('resolveAiChatTimeoutMs', () => {
  it('usa el default 30000 si no hay config', () => {
    expect(resolveAiChatTimeoutMs(base)).toBe(30_000);
  });
  it('usa el valor configurado válido', () => {
    expect(resolveAiChatTimeoutMs({ ...base, AI_CHAT_TIMEOUT_MS: '45000' } as Env)).toBe(45_000);
  });
  it('cae al default si el valor no es numérico o es <= 0', () => {
    expect(resolveAiChatTimeoutMs({ ...base, AI_CHAT_TIMEOUT_MS: 'abc' } as Env)).toBe(30_000);
    expect(resolveAiChatTimeoutMs({ ...base, AI_CHAT_TIMEOUT_MS: '0' } as Env)).toBe(30_000);
  });
});
