import type { Env } from '../types/env.types';

export type AdminChatNotifyPayload = {
  conversationId: string;
  userId: string;
  userEmail: string;
  text: string;
  aiEnabled: boolean;
};

/**
 * Notifica al admin (camino Telegram/n8n vía `N8N_CHAT_WEBHOOK_URL`) de que llegó un
 * mensaje `user` nuevo — SIEMPRE, con la IA on o off (spec P1 §9): con IA on el aviso
 * es informativo; con IA off es el disparador para que Jose responda desde la consola.
 *
 * Best-effort: nunca lanza. Si el webhook no está configurado (dev/test/entornos sin
 * n8n), o falla, se registra un warning y el pipeline del chat continúa sin bloquearse.
 */
export async function notifyAdminOfNewMessage(
  env: Env,
  payload: AdminChatNotifyPayload,
): Promise<void> {
  const url = env.N8N_CHAT_WEBHOOK_URL?.trim();
  if (!url) {
    console.warn(
      JSON.stringify({
        scope: 'admin-chat',
        action: 'notify-admin-skipped',
        hint: 'N8N_CHAT_WEBHOOK_URL no configurado; el admin no recibe aviso Telegram/n8n de este mensaje',
        conversationId: payload.conversationId,
      }),
    );
    return;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'admin_chat.user_message',
        conversationId: payload.conversationId,
        userId: payload.userId,
        userEmail: payload.userEmail,
        text: payload.text,
        aiEnabled: payload.aiEnabled,
      }),
    });

    if (!res.ok) {
      console.warn(
        JSON.stringify({
          scope: 'admin-chat',
          action: 'notify-admin-failed',
          conversationId: payload.conversationId,
          status: res.status,
        }),
      );
    }
  } catch (e) {
    console.warn(
      JSON.stringify({
        scope: 'admin-chat',
        action: 'notify-admin-error',
        conversationId: payload.conversationId,
        message: e instanceof Error ? e.message : 'unknown',
      }),
    );
  }
}
