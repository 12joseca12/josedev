export type ApiMode = 'development' | 'production';

export type Env = {
  API_MODE: ApiMode;
  WORKER_URL: string;
  WORKER_INTERNAL_TOKEN: string;
  CORS_ORIGINS: string;
  SUPABASE_URL: string;
  /** Legacy anon JWT (`eyJ...`) o clave publicable si no usas anon. */
  SUPABASE_ANON_KEY?: string;
  /** Recomendado en local: misma que `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. */
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  /** `true` (p. ej. `pnpm dev -- --mock`): foro solo en mock aunque exista service_role. */
  FORUM_USE_MOCK?: string;
  /** Opcional: `false` fuerza mock aunque haya service_role (compat). */
  FORUM_USE_DATABASE?: string;
  FORUM_MODERATION_DISABLED?: string;

  /**
   * Optional: protect /api/dev/* with a separate key.
   * If set, requests must include `x-dev-api-key`.
   */
  DEV_API_KEY?: string;

  /**
   * Optional: max ms to wait for upstream worker.
   */
  WORKER_TIMEOUT_MS?: string;

  /**
   * Optional: timeout ms for /ai/chat proxy to worker (default 30000).
   */
  AI_CHAT_TIMEOUT_MS?: string;

  /** UUIDs separados por coma con permisos de moderación en el foro (mock). */
  FORUM_ADMIN_USER_IDS?: string;

  /** Email del superusuario / administrador del chat. */
  ADMIN_SUPERUSER_EMAIL?: string;

  /** UUID en Supabase Auth (opcional; evita depender solo del email). */
  ADMIN_SUPERUSER_ID?: string;

  /** Ruta del worker IA para el chat (default `/ai/chat`). */
  ADMIN_CHAT_WORKER_PATH?: string;

  /** Timeout ms para la llamada IA del chat (default 60000). */
  ADMIN_CHAT_WORKER_TIMEOUT_MS?: string;
  /** Timeout para POST /emulator/session/start (arranque Docker + boot Android). */
  EMULATOR_SESSION_TIMEOUT_MS?: string;

  /** Webhook n8n (opcional; el chat usa worker IA por defecto). */
  N8N_CHAT_WEBHOOK_URL?: string;

  /** Secreto compartido: cabecera `x-n8n-chat-secret` en callback n8n → API. */
  N8N_CHAT_WEBHOOK_SECRET?: string;

  /** URL pública del API para callbacks n8n (p. ej. https://api.tudominio.com). */
  PUBLIC_API_BASE_URL?: string;

  /** Binding nativo de Cloudflare Rate Limiting para /ai/*. Ausente en dev local. */
  AI_RATE_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };

  /** Binding nativo de Cloudflare Rate Limiting para /demo/android/* (emulador público). Ausente en dev local. */
  EMULATOR_RATE_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };

  /**
   * Binding nativo de Cloudflare Workers AI (respuesta del admin-chat).
   * Opcional como `AI_RATE_LIMITER`: ausente en tests/env que no lo configuran;
   * `generateAdminReply` (ai-reply.ts) falla explícito si falta y el pipeline
   * cae al fallback local.
   */
  AI?: {
    run(
      model: string,
      opts: { messages: { role: string; content: string }[] },
    ): Promise<{ response?: string }>;
  };

  /** Modelo Workers AI para el admin-chat (default `@cf/meta/llama-3.3-70b-instruct-fp8-fast`). */
  AI_CHAT_MODEL?: string;
};
