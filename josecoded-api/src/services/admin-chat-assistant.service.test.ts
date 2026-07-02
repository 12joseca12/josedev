import {
  buildAdminChatWorkerMessage,
  extractWorkerChatContent,
  fallbackAssistantPlan,
} from './admin-chat-assistant.service';

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

describe('extractWorkerChatContent', () => {
  it('reads content from worker envelope', () => {
    const text = extractWorkerChatContent({
      ok: true,
      data: { content: 'Hola desde Ollama' },
    });
    expect(text).toBe('Hola desde Ollama');
  });

  it('reads nested gateway envelope', () => {
    const text = extractWorkerChatContent({
      ok: true,
      data: { ok: true, data: { content: 'Anidado' } },
    });
    expect(text).toBe('Anidado');
  });
});

describe('buildAdminChatWorkerMessage', () => {
  it('includes history and visitor message', () => {
    const msg = buildAdminChatWorkerMessage({
      userEmail: 'a@b.com',
      text: '¿Precio?',
      history: [
        {
          id: '1',
          conversationId: 'c',
          senderRole: 'user',
          senderId: null,
          messageType: 'text',
          content: 'Hola',
          metadata: {},
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    });
    expect(msg).toMatch(/VISITANTE: Hola/);
    expect(msg).toMatch(/¿Precio\?/);
    expect(msg).toMatch(/a@b\.com/);
  });
});
