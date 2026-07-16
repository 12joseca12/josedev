import type { Env } from '../types/env.types';
import { generateAdminReply } from './ai-reply';
import { insertAssistantMessage } from './admin-chat.pg-store';

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
 * Pipeline del chat: Workers AI (edge, con knowledge embebido) → fallback local.
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
  try {
    const { content, showMeetingPicker } = await generateAdminReply(env, {
      // TODO(P1 follow-up documentado): ventana de historial reciente. Por ahora
      // se pasa vacío — `generateAdminReply` ya resuelve con el turno actual del
      // usuario y el knowledge embebido; ver runAssistantPipeline en admin-chat-assistant.service.ts.
      history: [],
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
