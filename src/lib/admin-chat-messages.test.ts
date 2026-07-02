import { mapAdminChatMessageRow, mergeChatMessage } from "./admin-chat-messages";
import type { AdminChatMessageDTO } from "./types";

describe("admin-chat-messages", () => {
  it("maps postgres row to DTO", () => {
    const dto = mapAdminChatMessageRow({
      id: "m1",
      conversation_id: "c1",
      sender_role: "assistant",
      sender_id: null,
      content: "hola",
      message_type: "text",
      metadata: { status: "pending" },
      created_at: "2026-05-19T12:00:00Z",
    });
    expect(dto.id).toBe("m1");
    expect(dto.conversationId).toBe("c1");
    expect(dto.senderRole).toBe("assistant");
  });

  it("merge replaces optimistic user message with server row", () => {
    const optimistic: AdminChatMessageDTO = {
      id: "optimistic-1",
      conversationId: "c1",
      senderRole: "user",
      senderId: null,
      content: "hola",
      messageType: "text",
      metadata: {},
      createdAt: "2026-05-19T12:00:00Z",
    };
    const server: AdminChatMessageDTO = {
      id: "real-1",
      conversationId: "c1",
      senderRole: "user",
      senderId: "u1",
      content: "hola",
      messageType: "text",
      metadata: {},
      createdAt: "2026-05-19T12:00:01Z",
    };
    const merged = mergeChatMessage([optimistic], server);
    expect(merged.length).toBe(1);
    expect(merged[0]?.id).toBe("real-1");
  });

  it("merge updates existing id on UPDATE event", () => {
    const original: AdminChatMessageDTO = {
      id: "m1",
      conversationId: "c1",
      senderRole: "assistant",
      senderId: null,
      content: "elige fecha",
      messageType: "meeting_picker",
      metadata: { status: "pending" },
      createdAt: "2026-05-19T12:00:00Z",
    };
    const updated: AdminChatMessageDTO = {
      ...original,
      metadata: { status: "scheduled", selectedDate: "2026-05-20", selectedTime: "10:00" },
    };
    const merged = mergeChatMessage([original], updated);
    expect(merged.length).toBe(1);
    expect((merged[0]?.metadata as { status?: string }).status).toBe("scheduled");
  });
});
