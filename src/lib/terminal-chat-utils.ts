import type { AdminChatMessageDTO, AdminChatThreadDTO } from "@/lib/types";

export function lastMessageIsFromUser(thread: AdminChatThreadDTO): boolean {
  const last = thread.messages[thread.messages.length - 1];
  return last?.senderRole === "user";
}

export function shouldPollForAssistantReply(thread: AdminChatThreadDTO): boolean {
  return lastMessageIsFromUser(thread);
}

export function meetingPickerIsPending(msg: AdminChatMessageDTO): boolean {
  if (msg.messageType !== "meeting_picker") return false;
  const meta = msg.metadata as { status?: string };
  return meta.status !== "scheduled";
}

export type LastChatExchange = {
  lastUser?: AdminChatMessageDTO;
  lastAssistant?: AdminChatMessageDTO;
};

/** Último mensaje del visitante y última respuesta del asistente (para modo PiP). */
export function getLastChatExchange(messages: AdminChatMessageDTO[]): LastChatExchange {
  let lastUser: AdminChatMessageDTO | undefined;
  let lastAssistant: AdminChatMessageDTO | undefined;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg) continue;
    if (!lastUser && msg.senderRole === "user") lastUser = msg;
    if (!lastAssistant && msg.senderRole === "assistant") lastAssistant = msg;
    if (lastUser && lastAssistant) break;
  }

  return { lastUser, lastAssistant };
}
