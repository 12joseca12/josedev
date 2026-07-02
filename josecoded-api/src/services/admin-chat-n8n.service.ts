/**
 * Compat: reexporta el pipeline actual (worker IA, sin n8n obligatorio).
 * El endpoint `/admin-chat/n8n/inbound` se mantiene por si activas n8n manualmente.
 */
export {
  applyAssistantReply as applyInboundFromN8n,
  fallbackAssistantPlan,
  runAssistantPipeline,
} from './admin-chat-assistant.service';

export type { AssistantReplyPlan } from './admin-chat-assistant.service';
