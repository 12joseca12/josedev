import type { Env } from '../types/env.types';
import type { AdminChatMessageDTO } from '../types/admin-chat.types';
import { callWorker, UpstreamError } from './worker.service';
import {
  getRecentMessagesForPrompt,
  insertAssistantMessage,
} from './admin-chat.pg-store';

export type AssistantReplyPlan = {
  reply: string;
  showMeetingPicker: boolean;
};

const MEETING_HINT =
  /(reuni[oó]n|llamada|meet|videollamada|agendar|calendario|disponibilidad|hablar en persona|MEETING_PICKER)/i;

const STACK_HINT =
  /(tecnolog[ií]a|tecnolig|stack|lenguaje|framework|next\.?js|react|typescript|supabase|tailwind|aws|cloudflare|full\s*stack|qué\s+usas|que\s+usas|qué\s+manejas|que\s+manejas)/i;

const GREETING_HINT = /^(hola|buenas|hey|hi|hello|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches)\b/i;

const DEFAULT_ADMIN_CHAT_WORKER_PATH = '/ai/admin-chat';
const ADMIN_CHAT_NUM_PREDICT = 420;
const ADMIN_CHAT_WORKER_TIMEOUT_MS = 60_000;

/** Respuesta local si el worker no está disponible. */
export function fallbackAssistantPlan(text: string): AssistantReplyPlan {
  const normalized = text.trim();

  if (MEETING_HINT.test(normalized)) {
    return {
      reply:
        'Puedo coordinar una reunión con el administrador. Elige día y hora en el selector inferior; revisará la solicitud y te confirmará.',
      showMeetingPicker: true,
    };
  }

  if (STACK_HINT.test(normalized)) {
    return {
      reply:
        'Stack principal: Next.js, React, TypeScript, Tailwind CSS, PostgreSQL/Supabase, APIs en Cloudflare Workers y despliegue en AWS cuando el proyecto lo pide. Priorizo rendimiento, tipado estricto, RLS en datos y UX responsive. ¿Quieres detalle en frontend, backend, datos o infra?',
      showMeetingPicker: false,
    };
  }

  if (GREETING_HINT.test(normalized)) {
    return {
      reply:
        'Hola. Soy el canal del administrador: puedo orientarte sobre servicios, plazos, stack y encaje del proyecto. ¿En qué te ayudo?',
      showMeetingPicker: false,
    };
  }

  return {
    reply:
      'Gracias por escribir. Represento los intereses del administrador: puedo orientarte sobre servicios, plazos, stack y encaje del proyecto. ¿Qué necesitas concretamente?',
    showMeetingPicker: false,
  };
}

export function buildAdminChatWorkerMessage(input: {
  userEmail: string;
  text: string;
  history: AdminChatMessageDTO[];
}): string {
  const historyLines = input.history
    .filter((m) => m.content.trim())
    .map((m) => {
      const role = m.senderRole === 'user' ? 'VISITANTE' : 'ADMIN';
      return `${role}: ${m.content.trim().slice(0, 900)}`;
    })
    .join('\n');

  return [
    'Modo: chat terminal del portfolio (visitante ↔ administrador José Dev).',
    'El worker ya tiene contexto de conocimiento del administrador en el system prompt; úsalo.',
    `Email visitante: ${input.userEmail || 'no indicado'}`,
    '',
    '--- Historial reciente ---',
    historyLines || '(sin mensajes previos)',
    '',
    '--- Nuevo mensaje del visitante ---',
    input.text.trim(),
    '',
    'Responde en el idioma del visitante, breve y profesional.',
    'Si pide reunión, llamada o asesoría extensa en directo, añade una línea final exacta: MEETING_PICKER',
  ].join('\n');
}

/** Extrae texto del worker (`{ ok, data: { content } }` o anidado vía gateway). */
export function extractWorkerChatContent(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;

  const readContent = (node: unknown): string | null => {
    if (!node || typeof node !== 'object') return null;
    const obj = node as Record<string, unknown>;
    if (typeof obj.content === 'string' && obj.content.trim()) return obj.content.trim();
    if (obj.ok === true && obj.data) return readContent(obj.data);
    return null;
  };

  return readContent(root);
}

function resolveMeetingPicker(userText: string, assistantText: string): boolean {
  if (/\bMEETING_PICKER\b/i.test(assistantText)) return true;
  return MEETING_HINT.test(userText);
}

function stripMeetingMarker(text: string): string {
  return text.replace(/\n?\s*MEETING_PICKER\s*$/i, '').trim();
}

function workerPath(env: Env): string {
  const custom = env.ADMIN_CHAT_WORKER_PATH?.trim();
  return custom && custom.startsWith('/') ? custom : DEFAULT_ADMIN_CHAT_WORKER_PATH;
}

async function callAdminChatWorker(
  env: Env,
  message: string,
): Promise<string | null> {
  const path = workerPath(env);
  const timeoutMs = env.ADMIN_CHAT_WORKER_TIMEOUT_MS
    ? Number(env.ADMIN_CHAT_WORKER_TIMEOUT_MS)
    : ADMIN_CHAT_WORKER_TIMEOUT_MS;

  try {
    const raw = await callWorker<unknown>(env, path, {
      method: 'POST',
      body: { message, numPredict: ADMIN_CHAT_NUM_PREDICT },
      timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : ADMIN_CHAT_WORKER_TIMEOUT_MS,
    });
    return extractWorkerChatContent(raw);
  } catch (e) {
    const base = {
      scope: 'admin-chat',
      action: 'worker-failed',
      path,
      workerUrl: env.WORKER_URL,
    };
    if (e instanceof UpstreamError) {
      console.warn(
        JSON.stringify({
          ...base,
          status: e.status,
          message: e.message,
          data: e.data,
        }),
      );
    } else {
      console.warn(
        JSON.stringify({
          ...base,
          message: e instanceof Error ? e.message : 'unknown',
        }),
      );
    }
    return null;
  }
}

export async function applyAssistantReply(
  env: Env,
  payload: { conversationId: string; reply: string; showMeetingPicker?: boolean },
): Promise<void> {
  await insertAssistantMessage(env, {
    conversationId: payload.conversationId,
    content: payload.reply.trim(),
    messageType: payload.showMeetingPicker ? 'meeting_picker' : 'text',
    metadata: payload.showMeetingPicker ? { status: 'pending' } : {},
  });
}

/**
 * Pipeline del chat: worker IA (Ollama + knowledge) → fallback local.
 * n8n no es necesario para este flujo.
 */
export async function runAssistantPipeline(
  env: Env,
  input: {
    conversationId: string;
    messageId: string;
    userId: string;
    userEmail: string;
    text: string;
  },
): Promise<void> {
  const history = await getRecentMessagesForPrompt(env, input.conversationId, 14);
  const prompt = buildAdminChatWorkerMessage({
    userEmail: input.userEmail,
    text: input.text,
    history,
  });

  const workerContent = await callAdminChatWorker(env, prompt);
  if (!workerContent) {
    console.warn(
      JSON.stringify({
        scope: 'admin-chat',
        action: 'using-fallback',
        hint: 'Revisa WORKER_URL, WORKER_INTERNAL_TOKEN (= BACKEND_INTERNAL_TOKEN) y que el túnel ngrok esté activo',
      }),
    );
  }
  if (workerContent) {
    const showMeetingPicker = resolveMeetingPicker(input.text, workerContent);
    await applyAssistantReply(env, {
      conversationId: input.conversationId,
      reply: stripMeetingMarker(workerContent),
      showMeetingPicker,
    });
    return;
  }

  const plan = fallbackAssistantPlan(input.text);
  await applyAssistantReply(env, {
    conversationId: input.conversationId,
    reply: plan.reply,
    showMeetingPicker: plan.showMeetingPicker,
  });
}
