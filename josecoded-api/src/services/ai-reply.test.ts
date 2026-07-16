import { buildAdminChatMessages, generateAdminReply } from './ai-reply';
import type { Env } from '../types/env.types';

describe('buildAdminChatMessages', () => {
  it('pone system con knowledge primero, luego historial y el turno del usuario', () => {
    const msgs = buildAdminChatMessages(
      'CTX',
      [
        { role: 'user', content: 'hola' },
        { role: 'assistant', content: 'hey' },
      ],
      'precio?',
    );
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('CTX');
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'precio?' });
  });
});

describe('generateAdminReply', () => {
  const env = { AI: { run: async () => ({ response: 'Claro, te ayudo.' }) } } as unknown as Env;

  it('devuelve el texto y showMeetingPicker=false sin marcador', async () => {
    const r = await generateAdminReply(env, { history: [], userText: 'hola' });
    expect(r.content).toBe('Claro, te ayudo.');
    expect(r.showMeetingPicker).toBe(false);
  });

  it('detecta MEETING_PICKER y lo quita del texto', async () => {
    const env2 = {
      ...env,
      AI: { run: async () => ({ response: 'Te propongo una llamada.\nMEETING_PICKER' }) },
    } as unknown as Env;
    const r = await generateAdminReply(env2, { history: [], userText: 'reunion?' });
    expect(r.showMeetingPicker).toBe(true);
    expect(r.content).not.toContain('MEETING_PICKER');
    expect(r.content.trim()).toBe('Te propongo una llamada.');
  });
});
