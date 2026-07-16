import type { Env } from '../types/env.types';
import { generateAdminReply } from './ai-reply';
import {
  getConversationFlags,
  getRecentHistory,
  insertAssistantMessage,
} from './admin-chat.pg-store';
import { notifyAdminOfNewMessage } from './admin-chat-notify.service';

export type AssistantReplyPlan = {
  reply: string;
  showMeetingPicker: boolean;
};

const MEETING_HINT =
  /(reuni[oó]n|llamada|meet|videollamada|agendar|calendario|disponibilidad|hablar en persona|MEETING_PICKER)/i;

const STACK_HINT =
  /(tecnolog[ií]a|tecnolig|stack|lenguaje|framework|next\.?js|react|typescript|supabase|tailwind|aws|cloudflare|full\s*stack|qué\s+usas|que\s+usas|qué\s+manejas|que\s+manejas)/i;

const GREETING_HINT = /^(hola|buenas|hey|hi|hello|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches)\b/i;

/** Respuesta local si Workers AI falla o no responde. */
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
 * Pipeline del chat: gate `ai_enabled` por conversación → Workers AI (edge, con
 * knowledge embebido + historial reciente) → fallback local. El admin se notifica
 * SIEMPRE (IA on o off) por el camino Telegram/n8n existente (P1 Task 4 / spec §9).
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
  // Fail-CLOSED (P1 Task 5 fix): si no se puede leer `ai_enabled`, la IA NO responde.
  // Ante un error de lectura puede haber un takeover humano en curso (admin apagó la
  // IA); contestar igual arriesga pisar al admin. La notificación sigue disparándose
  // siempre, así que Jose se entera del mensaje aunque la IA se quede callada.
  let aiEnabled = false;
  try {
    ({ aiEnabled } = await getConversationFlags(env, input.conversationId));
  } catch (e) {
    console.warn(
      JSON.stringify({
        scope: 'admin-chat',
        action: 'conversation-flags-failed',
        hint: 'No se pudo leer ai_enabled; se asume false (fail-closed) para no responder durante un posible takeover humano',
        conversationId: input.conversationId,
        message: e instanceof Error ? e.message : 'unknown',
      }),
    );
  }

  // Notificar SIEMPRE al admin (IA on u off) — best-effort, nunca bloquea el pipeline.
  await notifyAdminOfNewMessage(env, {
    conversationId: input.conversationId,
    userId: input.userId,
    userEmail: input.userEmail,
    text: input.text,
    aiEnabled,
  });

  if (!aiEnabled) {
    // IA apagada para esta conversación: Jose responde desde la consola admin.
    return;
  }

  try {
    const history = await getRecentHistory(env, input.conversationId, input.messageId, 8);
    const { content, showMeetingPicker } = await generateAdminReply(env, {
      history,
      userText: input.text,
    });

    if (content) {
      await applyAssistantReply(env, {
        conversationId: input.conversationId,
        reply: content,
        showMeetingPicker,
      });
      return;
    }

    console.warn(
      JSON.stringify({
        scope: 'admin-chat',
        action: 'empty-ai-reply',
        hint: 'env.AI.run devolvió una respuesta vacía; usando fallback local',
      }),
    );
  } catch (e) {
    console.warn(
      JSON.stringify({
        scope: 'admin-chat',
        action: 'ai-reply-failed',
        hint: 'Revisa el binding AI (Workers AI) en wrangler.jsonc y AI_CHAT_MODEL',
        message: e instanceof Error ? e.message : 'unknown',
      }),
    );
  }

  const plan = fallbackAssistantPlan(input.text);
  await applyAssistantReply(env, {
    conversationId: input.conversationId,
    reply: plan.reply,
    showMeetingPicker: plan.showMeetingPicker,
  });
}
