import {
  getLastChatExchange,
  lastMessageIsFromUser,
  meetingPickerIsPending,
  shouldPollForAssistantReply,
} from "./terminal-chat-utils";
import type { AdminChatThreadDTO } from "./types";

function thread(messages: AdminChatThreadDTO["messages"]): AdminChatThreadDTO {
  return { conversationId: "c1", messages };
}

describe("terminal-chat-utils", () => {
  it("detects last user message", () => {
    const t = thread([
      {
        id: "1",
        conversationId: "c1",
        senderRole: "assistant",
        senderId: "a",
        content: "hola",
        messageType: "text",
        metadata: {},
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "2",
        conversationId: "c1",
        senderRole: "user",
        senderId: "u",
        content: "ok",
        messageType: "text",
        metadata: {},
        createdAt: "2026-01-01T00:01:00Z",
      },
    ]);
    expect(lastMessageIsFromUser(t)).toBe(true);
    expect(shouldPollForAssistantReply(t)).toBe(true);
  });

  it("does not poll when assistant replied", () => {
    const t = thread([
      {
        id: "1",
        conversationId: "c1",
        senderRole: "user",
        senderId: "u",
        content: "reunión",
        messageType: "text",
        metadata: {},
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "2",
        conversationId: "c1",
        senderRole: "assistant",
        senderId: "a",
        content: "elige fecha",
        messageType: "meeting_picker",
        metadata: { status: "pending" },
        createdAt: "2026-01-01T00:01:00Z",
      },
    ]);
    expect(lastMessageIsFromUser(t)).toBe(false);
    expect(shouldPollForAssistantReply(t)).toBe(false);
  });

  it("getLastChatExchange returns latest user and assistant messages", () => {
    const { lastUser, lastAssistant } = getLastChatExchange([
      {
        id: "1",
        conversationId: "c1",
        senderRole: "user",
        senderId: "u",
        content: "primera",
        messageType: "text",
        metadata: {},
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "2",
        conversationId: "c1",
        senderRole: "assistant",
        senderId: "a",
        content: "respuesta 1",
        messageType: "text",
        metadata: {},
        createdAt: "2026-01-01T00:01:00Z",
      },
      {
        id: "3",
        conversationId: "c1",
        senderRole: "user",
        senderId: "u",
        content: "segunda",
        messageType: "text",
        metadata: {},
        createdAt: "2026-01-01T00:02:00Z",
      },
    ]);
    expect(lastUser?.content).toBe("segunda");
    expect(lastAssistant?.content).toBe("respuesta 1");
  });

  it("meeting picker pending vs scheduled", () => {
    expect(
      meetingPickerIsPending({
        id: "m",
        conversationId: "c1",
        senderRole: "assistant",
        senderId: null,
        content: "",
        messageType: "meeting_picker",
        metadata: { status: "pending" },
        createdAt: "",
      }),
    ).toBe(true);
    expect(
      meetingPickerIsPending({
        id: "m",
        conversationId: "c1",
        senderRole: "assistant",
        senderId: null,
        content: "",
        messageType: "meeting_picker",
        metadata: { status: "scheduled", selectedDate: "2026-05-20", selectedTime: "10:00" },
        createdAt: "",
      }),
    ).toBe(false);
  });
});
