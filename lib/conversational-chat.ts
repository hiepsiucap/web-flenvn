export type ChatRole = "user" | "assistant";
export type ChatMessageStatus = "sending" | "sent" | "failed";

export type PersistedChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ChatMessage = Omit<PersistedChatMessage, "createdAt"> & {
  createdAt: string | null;
  status: ChatMessageStatus;
  clientMessageId?: string;
};

export type ChatConversation = {
  id: string;
  title: string;
  targetLanguage: string;
  englishLevel: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toChatMessage(message: PersistedChatMessage): ChatMessage {
  return { ...message, status: "sent" };
}

export function createOptimisticMessage(
  content: string,
  clientMessageId: string,
): ChatMessage {
  return {
    id: clientMessageId,
    clientMessageId,
    role: "user",
    content: content.trim(),
    createdAt: null,
    status: "sending",
  };
}

export function failOptimisticMessage(
  messages: ChatMessage[],
  clientMessageId: string,
): ChatMessage[] {
  return messages.map((message) =>
    message.clientMessageId === clientMessageId
      ? { ...message, status: "failed" }
      : message,
  );
}

export function resolveOptimisticMessage(
  messages: ChatMessage[],
  clientMessageId: string,
  userMessage: PersistedChatMessage,
  assistantMessage: PersistedChatMessage,
): ChatMessage[] {
  let resolved = messages.map((message) =>
    message.clientMessageId === clientMessageId
      ? toChatMessage(userMessage)
      : message,
  );
  if (!resolved.some((message) => message.id === userMessage.id)) {
    resolved = [...resolved, toChatMessage(userMessage)];
  }
  if (!resolved.some((message) => message.id === assistantMessage.id)) {
    resolved = [...resolved, toChatMessage(assistantMessage)];
  }
  return resolved;
}

export function upsertConversation(
  conversations: ChatConversation[],
  conversation: ChatConversation,
): ChatConversation[] {
  return [
    conversation,
    ...conversations.filter((item) => item.id !== conversation.id),
  ];
}
