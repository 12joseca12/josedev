import type { Env } from '../types/env.types';
import { callWorker } from './worker.service';
import type { ForumSegment } from '../types/forum.types';

export class ForumModerationDeniedError extends Error {
  constructor() {
    super('Forum moderation denied');
    this.name = 'ForumModerationDeniedError';
  }
}

export class ForumModerationUnavailableError extends Error {
  constructor(cause?: string) {
    super(cause ?? 'Forum moderation unavailable');
    this.name = 'ForumModerationUnavailableError';
  }
}

function segmentsToPlainText(segments: ForumSegment[]): string {
  return segments
    .map((s) => {
      if (s.type === 'text' || s.type === 'code') return s.content;
      return '';
    })
    .join('\n');
}

function extractAiVerdict(payload: unknown): 'allow' | 'deny' | 'unknown' {
  const raw = JSON.stringify(payload ?? '').toUpperCase();
  if (/\bDENY\b/.test(raw)) return 'deny';
  if (/\bALLOW\b/.test(raw)) return 'allow';
  return 'unknown';
}

/**
 * Llama al worker upstream `/ai/chat` con un prompt de clasificación.
 * `FORUM_MODERATION_DISABLED=true` → no llama (solo tests / emergencia).
 */
export async function assertForumContentAllowed(
  env: Env,
  parts: { title?: string; segments?: ForumSegment[] }[],
): Promise<void> {
  if (env.FORUM_MODERATION_DISABLED === 'true') return;

  const chunks: string[] = [];
  for (const p of parts) {
    if (p.title?.trim()) chunks.push(p.title.trim());
    if (p.segments?.length) chunks.push(segmentsToPlainText(p.segments));
  }
  const combined = chunks.join('\n---\n').trim().slice(0, 12_000);
  if (!combined) return;

  const prompt = [
    'You are a strict content safety classifier for a public technical forum.',
    'Reject (DENY) content that includes: hate, harassment, sexual content involving minors, instructions for illegal weapons or drugs, self-harm encouragement, or clearly malicious illegal activity.',
    'Allow (ALLOW) normal engineering, infrastructure, and professional discussion even if it mentions security, cryptography, or regulated industries in a legal/educational context.',
    'Reply with exactly one word: ALLOW or DENY. No punctuation, no explanation.',
    '',
    '--- USER CONTENT ---',
    combined,
  ].join('\n');

  try {
    const data = await callWorker<unknown>(env, '/ai/chat', {
      method: 'POST',
      body: { message: prompt, numPredict: 32 },
    });
    const verdict = extractAiVerdict(data);
    if (verdict === 'deny') throw new ForumModerationDeniedError();
    if (verdict === 'unknown') throw new ForumModerationUnavailableError('Could not parse moderation response');
  } catch (e) {
    if (e instanceof ForumModerationDeniedError) throw e;
    if (e instanceof ForumModerationUnavailableError) throw e;
    throw new ForumModerationUnavailableError(e instanceof Error ? e.message : undefined);
  }
}
