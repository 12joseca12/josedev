import type { Env } from '../types/env.types';
import { fallbackAssistantPlan } from './admin-chat-assistant.service';

const baseEnv = {
  API_MODE: 'development',
  WORKER_URL: 'http://127.0.0.1:8787',
  WORKER_INTERNAL_TOKEN: 'local-dev-worker-internal-token',
  CORS_ORIGINS: '',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
} satisfies Env;

const baseInput = {
  conversationId: 'conv-1',
  messageId: 'msg-current',
  userId: 'user-1',
  userEmail: 'visitor@example.com',
  text: 'hola, tienen disponibilidad?',
};

describe('fallbackAssistantPlan', () => {
  it('suggests meeting picker for reunion keywords', () => {
    const plan = fallbackAssistantPlan('¿Podemos tener una reunión la próxima semana?');
    expect(plan.showMeetingPicker).toBe(true);
    expect(plan.reply).toMatch(/reuni/i);
  });

  it('returns generic reply otherwise', () => {
    const plan = fallbackAssistantPlan('Necesito una web corporativa');
    expect(plan.showMeetingPicker).toBe(false);
    expect(plan.reply).toMatch(/administrador/i);
  });

  it('answers stack questions with a specific reply', () => {
    const plan = fallbackAssistantPlan('¿Qué tecnologías manejas?');
    expect(plan.showMeetingPicker).toBe(false);
    expect(plan.reply).toMatch(/Next\.js/i);
  });
});

describe('runAssistantPipeline', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('aiEnabled=false: does not call generateAdminReply, but always notifies the admin', async () => {
    jest.resetModules();
    const notifySpy = jest.fn().mockResolvedValue(undefined);
    const generateSpy = jest.fn();
    const getRecentHistorySpy = jest.fn();
    const insertAssistantMessageSpy = jest.fn().mockResolvedValue({});

    jest.doMock('./admin-chat.pg-store', () => ({
      getConversationFlags: jest.fn().mockResolvedValue({ aiEnabled: false }),
      getRecentHistory: getRecentHistorySpy,
      insertAssistantMessage: insertAssistantMessageSpy,
    }));
    jest.doMock('./ai-reply', () => ({ generateAdminReply: generateSpy }));
    jest.doMock('./admin-chat-notify.service', () => ({ notifyAdminOfNewMessage: notifySpy }));

    const { runAssistantPipeline } = await import('./admin-chat-assistant.service');
    await runAssistantPipeline(baseEnv, baseInput);

    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({
        conversationId: baseInput.conversationId,
        userId: baseInput.userId,
        userEmail: baseInput.userEmail,
        text: baseInput.text,
        aiEnabled: false,
      }),
    );
    expect(generateSpy).not.toHaveBeenCalled();
    expect(getRecentHistorySpy).not.toHaveBeenCalled();
    expect(insertAssistantMessageSpy).not.toHaveBeenCalled();
  });

  it('aiEnabled=true: notifies the admin AND calls generateAdminReply with non-empty history', async () => {
    jest.resetModules();
    const notifySpy = jest.fn().mockResolvedValue(undefined);
    const history = [
      { role: 'user' as const, content: 'mensaje anterior del usuario' },
      { role: 'assistant' as const, content: 'respuesta anterior' },
    ];
    const getRecentHistorySpy = jest.fn().mockResolvedValue(history);
    const generateSpy = jest
      .fn()
      .mockResolvedValue({ content: 'Respuesta de la IA', showMeetingPicker: false });
    const insertAssistantMessageSpy = jest.fn().mockResolvedValue({});

    jest.doMock('./admin-chat.pg-store', () => ({
      getConversationFlags: jest.fn().mockResolvedValue({ aiEnabled: true }),
      getRecentHistory: getRecentHistorySpy,
      insertAssistantMessage: insertAssistantMessageSpy,
    }));
    jest.doMock('./ai-reply', () => ({ generateAdminReply: generateSpy }));
    jest.doMock('./admin-chat-notify.service', () => ({ notifyAdminOfNewMessage: notifySpy }));

    const { runAssistantPipeline } = await import('./admin-chat-assistant.service');
    await runAssistantPipeline(baseEnv, baseInput);

    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({ conversationId: baseInput.conversationId, aiEnabled: true }),
    );

    expect(getRecentHistorySpy).toHaveBeenCalledWith(
      baseEnv,
      baseInput.conversationId,
      baseInput.messageId,
      8,
    );
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(generateSpy).toHaveBeenCalledWith(baseEnv, { history, userText: baseInput.text });
    expect(history.length).toBeGreaterThan(0);

    expect(insertAssistantMessageSpy).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({ conversationId: baseInput.conversationId, content: 'Respuesta de la IA' }),
    );
  });

  it('falls back locally and still notifies when generateAdminReply throws (aiEnabled=true)', async () => {
    jest.resetModules();
    const notifySpy = jest.fn().mockResolvedValue(undefined);
    const getRecentHistorySpy = jest.fn().mockResolvedValue([]);
    const generateSpy = jest.fn().mockRejectedValue(new Error('AI binding missing'));
    const insertAssistantMessageSpy = jest.fn().mockResolvedValue({});

    jest.doMock('./admin-chat.pg-store', () => ({
      getConversationFlags: jest.fn().mockResolvedValue({ aiEnabled: true }),
      getRecentHistory: getRecentHistorySpy,
      insertAssistantMessage: insertAssistantMessageSpy,
    }));
    jest.doMock('./ai-reply', () => ({ generateAdminReply: generateSpy }));
    jest.doMock('./admin-chat-notify.service', () => ({ notifyAdminOfNewMessage: notifySpy }));

    const { runAssistantPipeline } = await import('./admin-chat-assistant.service');
    await runAssistantPipeline(baseEnv, baseInput);

    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(insertAssistantMessageSpy).toHaveBeenCalledTimes(1);
    const [, payload] = insertAssistantMessageSpy.mock.calls[0];
    expect(payload.conversationId).toBe(baseInput.conversationId);
    expect(typeof payload.content).toBe('string');
    expect(payload.content.length).toBeGreaterThan(0);
  });

  it('fail-closed: getConversationFlags rejects -> does NOT call the AI, but DOES notify (aiEnabled=false)', async () => {
    jest.resetModules();
    const notifySpy = jest.fn().mockResolvedValue(undefined);
    const generateSpy = jest.fn();
    const getRecentHistorySpy = jest.fn();
    const insertAssistantMessageSpy = jest.fn().mockResolvedValue({});

    jest.doMock('./admin-chat.pg-store', () => ({
      getConversationFlags: jest.fn().mockRejectedValue(new Error('read error (possible RLS/network blip)')),
      getRecentHistory: getRecentHistorySpy,
      insertAssistantMessage: insertAssistantMessageSpy,
    }));
    jest.doMock('./ai-reply', () => ({ generateAdminReply: generateSpy }));
    jest.doMock('./admin-chat-notify.service', () => ({ notifyAdminOfNewMessage: notifySpy }));

    const { runAssistantPipeline } = await import('./admin-chat-assistant.service');
    await runAssistantPipeline(baseEnv, baseInput);

    // Fail-closed: on a flags-read error the AI must NOT reply (a human takeover may
    // be in progress) — but the admin notification still fires unconditionally.
    expect(generateSpy).not.toHaveBeenCalled();
    expect(getRecentHistorySpy).not.toHaveBeenCalled();
    expect(insertAssistantMessageSpy).not.toHaveBeenCalled();

    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({
        conversationId: baseInput.conversationId,
        aiEnabled: false,
      }),
    );
  });
});
