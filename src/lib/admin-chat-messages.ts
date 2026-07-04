import type { AdminChatMessageDTO, AdminChatMessageType, AdminChatSenderRole } from "@/lib/types";

/** Fila Postgres / payload Realtime de `admin_chat_messages`. */
export type AdminChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_role: string;
  sender_id: string | null;
  content: string;
  message_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function mapAdminChatMessageRow(row: AdminChatMessageRow): AdminChatMessageDTO {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderRole: row.sender_role as AdminChatSenderRole,
    senderId: row.sender_id,
    content: row.content,
    messageType: row.message_type as AdminChatMessageType,
    metadata: (row.metadata ?? {}) as AdminChatMessageDTO["metadata"],
    createdAt: row.created_at,
  };
}

/** Inserta o actualiza un mensaje; elimina optimista duplicado del mismo texto de usuario. */
export function mergeChatMessage(
  messages: AdminChatMessageDTO[],
  incoming: AdminChatMessageDTO,
): AdminChatMessageDTO[] {
  let next = messages;

  if (incoming.senderRole === "user") {
    const optimisticIdx = messages.findIndex(
      (m) =>
        m.id.startsWith("optimistic-") &&
        m.senderRole === "user" &&
        m.content.trim() === incoming.content.trim(),
    );
    if (optimisticIdx >= 0) {
      next = messages.filter((_, i) => i !== optimisticIdx);
    }
  }

  const existingIdx = next.findIndex((m) => m.id === incoming.id);
  if (existingIdx >= 0) {
    const updated = [...next];
    updated[existingIdx] = incoming;
    return updated;
  }

  return [...next, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
