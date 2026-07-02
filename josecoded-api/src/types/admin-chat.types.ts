export type AdminChatSenderRole = 'user' | 'assistant' | 'system';

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
