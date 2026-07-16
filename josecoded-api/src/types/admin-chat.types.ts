export type AdminChatSenderRole = 'user' | 'assistant' | 'admin';

export type AdminChatMessageType = 'text' | 'meeting_picker';

export type AdminChatMeetingMetadata = {
  status: 'pending' | 'scheduled';
  selectedDate?: string;
  selectedTime?: string;
};

export type AdminChatMessageDTO = {
  id: string;
  conversationId: string;
  senderRole: AdminChatSenderRole;
  senderId: string | null;
  content: string;
  messageType: AdminChatMessageType;
  metadata: AdminChatMeetingMetadata | Record<string, unknown>;
  createdAt: string;
};

export type AdminChatThreadDTO = {
  conversationId: string;
  messages: AdminChatMessageDTO[];
};

/** Fila resumen para la consola admin (P1 Task 5): una por conversación. */
export type AdminConversationSummaryDTO = {
  id: string;
  userId: string;
  userEmail: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  aiEnabled: boolean;
  unread: boolean;
};
