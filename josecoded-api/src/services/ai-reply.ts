import type { Env } from '../types/env.types';
import { getKnowledgeContext } from './knowledge';

const SYSTEM_PROMPT = `Eres el asistente del administrador en el chat del portfolio josecoded.
Respondes en nombre del administrador (Jose Dev): servicios, stack, plazos orientativos y encaje del proyecto.
Usa solo el contexto proporcionado. Se breve y profesional.
Si el visitante pide reunion, llamada o asesoria extensa en directo, termina la respuesta con una linea final exacta: MEETING_PICKER`;

/**
 * `@cf/meta/llama-3.1-8b-instruct` figura como "Deprecated" en el catálogo vigente de
 * Workers AI (verificado 2026-07-16 vía developers.cloudflare.com/workers-ai/models/).
 * Se usa en su lugar `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (Active, cuantizado fp8
 * y optimizado para velocidad), confirmado con `env.AI.run(model, { messages })` →
 * `{ response, usage, tool_calls }`.
 */
const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MEETING_MARKER = 'MEETING_PICKER';

export function buildAdminChatMessages(
  knowledge: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userText: string,
) {
  return [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\nContexto:\n\n${knowledge}` },
    ...history,
    { role: 'user', content: userText },
  ];
}

export async function generateAdminReply(
  env: Env,
  input: { history: { role: 'user' | 'assistant'; content: string }[]; userText: string },
): Promise<{ content: string; showMeetingPicker: boolean }> {
  if (!env.AI) {
    throw new Error('AI binding missing: configure "ai": { "binding": "AI" } in wrangler.jsonc');
  }
  const knowledge = getKnowledgeContext();
  const messages = buildAdminChatMessages(knowledge, input.history, input.userText);
  const model = env.AI_CHAT_MODEL ?? DEFAULT_MODEL;
  const out = await env.AI.run(model, { messages });
  const raw = (out.response ?? '').trim();
  const showMeetingPicker = raw.includes(MEETING_MARKER);
  const content = raw.replace(new RegExp(`\\n?\\s*${MEETING_MARKER}\\s*$`), '').trim();
  return { content, showMeetingPicker };
}
