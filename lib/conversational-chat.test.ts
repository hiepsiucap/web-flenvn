import { describe, expect, it } from "vitest";

import {
  createOptimisticMessage,
  failOptimisticMessage,
  resolveOptimisticMessage,
  upsertConversation,
} from "@/lib/conversational-chat";

describe("conversational chat state", () => {
  it("creates a retryable optimistic user message", () => {
    expect(createOptimisticMessage("  Explain present perfect  ", "client-1")).toEqual({
      id: "client-1",
      clientMessageId: "client-1",
      role: "user",
      content: "Explain present perfect",
      createdAt: null,
      status: "sending",
    });
  });

  it("replaces the optimistic message and appends the assistant reply", () => {
    const optimistic = createOptimisticMessage("Hello", "client-1");
    const messages = resolveOptimisticMessage(
      [optimistic],
      "client-1",
      { id: "user-1", role: "user", content: "Hello", createdAt: "2026-10-02T00:00:00Z" },
      { id: "assistant-1", role: "assistant", content: "Hi!", createdAt: "2026-10-02T00:00:01Z" },
    );

    expect(messages.map((message) => message.id)).toEqual(["user-1", "assistant-1"]);
    expect(messages.every((message) => message.status === "sent")).toBe(true);
  });

  it("restores both persisted messages if a concurrent reload removed the optimistic one", () => {
    const messages = resolveOptimisticMessage(
      [],
      "client-1",
      { id: "user-1", role: "user", content: "Hello", createdAt: "2026-10-02T00:00:00Z" },
      { id: "assistant-1", role: "assistant", content: "Hi!", createdAt: "2026-10-02T00:00:01Z" },
    );

    expect(messages.map((message) => message.id)).toEqual(["user-1", "assistant-1"]);
  });

  it("marks the same client message for retry after failure", () => {
    const optimistic = createOptimisticMessage("Hello", "client-1");
    expect(failOptimisticMessage([optimistic], "client-1")[0]).toMatchObject({
      clientMessageId: "client-1",
      status: "failed",
    });
  });

  it("moves an updated conversation to the top without duplication", () => {
    const conversations = upsertConversation(
      [
        { id: "old", title: "Old", targetLanguage: "vi", englishLevel: null, createdAt: "1", updatedAt: "1" },
        { id: "active", title: "New conversation", targetLanguage: "vi", englishLevel: null, createdAt: "2", updatedAt: "2" },
      ],
      { id: "active", title: "Grammar help", targetLanguage: "vi", englishLevel: null, createdAt: "2", updatedAt: "3" },
    );

    expect(conversations.map((conversation) => conversation.id)).toEqual(["active", "old"]);
    expect(conversations[0].title).toBe("Grammar help");
  });
});
