import { fallbackAssistantPlan } from './admin-chat-assistant.service';

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
