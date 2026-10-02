"use client";

import {
  ChatCircleText,
  PaperPlaneTilt,
  Plus,
  Spinner,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { CreateFlashcardDialog } from "@/components/flashcards/create-flashcard-dialog";
import { ChatMessageContent } from "@/components/vocabulary/chat-message-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ApiEnvelope } from "@/lib/auth-types";
import { getBooksClient } from "@/lib/client-api";
import {
  type ChatConversation,
  type ChatMessage,
  type PersistedChatMessage,
  createOptimisticMessage,
  failOptimisticMessage,
  resolveOptimisticMessage,
  toChatMessage,
  upsertConversation,
} from "@/lib/conversational-chat";
import type { Book } from "@/lib/dashboard-data";
import { HttpError, http } from "@/lib/http";
import { cn } from "@/lib/utils";

type ConversationListResponse = {
  conversations: ChatConversation[];
  nextCursor: string | null;
};

type MessageListResponse = {
  messages: PersistedChatMessage[];
  nextCursor: string | null;
};

type MessageResponse = {
  userMessage: PersistedChatMessage;
  assistantMessage: PersistedChatMessage;
  provider: "gemini";
  model: string | null;
};

type ResponseLanguage = "vi" | "en";

const STARTER_PROMPTS = [
  "Explain the present perfect with simple examples.",
  "Help me improve this sentence: I have went there yesterday.",
  "What is the difference between say and tell?",
];

function unwrap<T>(response: ApiEnvelope<T> | T): T {
  return response && typeof response === "object" && "data" in response && "success" in response
    ? response.data
    : response as T;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    const data = error.data as { message?: string | string[] } | null;
    if (Array.isArray(data?.message)) return data.message.join(" ");
    if (data?.message) return data.message;
  }
  return error instanceof Error ? error.message : fallback;
}

function conversationTitle(message: string) {
  const singleLine = message.replace(/\s+/g, " ").trim();
  return singleLine.length <= 60
    ? singleLine
    : `${singleLine.slice(0, 57).trimEnd()}...`;
}

export function VocabularyChat() {
  const [books, setBooks] = useState<Book[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [responseLanguage, setResponseLanguage] = useState<ResponseLanguage>("vi");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const activeConversationRef = useRef<string | null>(null);
  const messageRequestRef = useRef(0);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  useEffect(() => {
    let active = true;

    void http.get<ApiEnvelope<ConversationListResponse> | ConversationListResponse>(
        "/api/ai/conversations",
        { query: { limit: 100 } },
      ).then((response) => {
      if (!active) return;
      const items = unwrap(response).conversations;
      setConversations(items);
      if (items.length) setLoadingMessages(true);
      setActiveConversationId((current) => {
        const next = current && items.some((item) => item.id === current)
          ? current
          : items[0]?.id ?? null;
        activeConversationRef.current = next;
        return next;
      });
      setError("");
    }).catch((cause) => {
      if (!active) return;
      setError(getErrorMessage(cause, "Could not load conversations."));
    }).finally(() => {
      if (!active) return;
      setLoadingConversations(false);
    });

    void getBooksClient().then((items) => {
      if (active) setBooks(items);
    }).catch(() => {
      if (active) setBooks([]);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    const requestId = ++messageRequestRef.current;

    void http.get<ApiEnvelope<MessageListResponse> | MessageListResponse>(
      `/api/ai/conversations/${activeConversationId}/messages`,
      { query: { limit: 100 } },
    ).then((response) => {
      if (requestId !== messageRequestRef.current) return;
      setMessages(unwrap(response).messages.map(toChatMessage));
    }).catch((cause) => {
      if (requestId !== messageRequestRef.current) return;
      setError(getErrorMessage(cause, "Could not load this conversation."));
    }).finally(() => {
      if (requestId === messageRequestRef.current) setLoadingMessages(false);
    });
  }, [activeConversationId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  function chooseConversation(conversation: ChatConversation) {
    messageRequestRef.current += 1;
    activeConversationRef.current = conversation.id;
    setActiveConversationId(conversation.id);
    setLoadingMessages(true);
    setResponseLanguage(conversation.targetLanguage === "en" ? "en" : "vi");
    setMessages([]);
    setDraft("");
    setError("");
  }

  function startNewChat() {
    messageRequestRef.current += 1;
    activeConversationRef.current = null;
    setActiveConversationId(null);
    setMessages([]);
    setLoadingMessages(false);
    setDraft("");
    setError("");
  }

  async function updateResponseLanguage(value: ResponseLanguage) {
    setResponseLanguage(value);
    if (!activeConversationId) return;

    try {
      const response = await http.patch<ApiEnvelope<ChatConversation> | ChatConversation>(
        `/api/ai/conversations/${activeConversationId}`,
        { targetLanguage: value },
      );
      setConversations((current) => upsertConversation(current, unwrap(response)));
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not update the response language."));
    }
  }

  async function sendMessage(
    content: string,
    clientMessageId = crypto.randomUUID(),
    retryConversationId?: string,
  ) {
    const text = content.trim();
    if (!text || sending) return;

    setSending(true);
    setError("");
    setDraft("");
    setMessages((current) => {
      const existing = current.some(
        (message) => message.clientMessageId === clientMessageId,
      );
      return existing
        ? current.map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, status: "sending" }
              : message,
          )
        : [...current, createOptimisticMessage(text, clientMessageId)];
    });

    let conversationId = retryConversationId ?? activeConversationRef.current;
    let conversation = conversations.find((item) => item.id === conversationId);

    try {
      if (!conversationId) {
        const response = await http.post<ApiEnvelope<ChatConversation> | ChatConversation>(
          "/api/ai/conversations",
          { targetLanguage: responseLanguage },
        );
        conversation = unwrap(response);
        conversationId = conversation.id;
        activeConversationRef.current = conversationId;
        setActiveConversationId(conversationId);
        setConversations((current) => upsertConversation(current, conversation as ChatConversation));
      }

      const response = await http.post<ApiEnvelope<MessageResponse> | MessageResponse>(
        `/api/ai/conversations/${conversationId}/messages`,
        { message: text, clientMessageId },
      );
      const reply = unwrap(response);

      if (activeConversationRef.current === conversationId) {
        setMessages((current) =>
          resolveOptimisticMessage(
            current,
            clientMessageId,
            reply.userMessage,
            reply.assistantMessage,
          ),
        );
      }

      const updatedConversation: ChatConversation = {
        ...(conversation as ChatConversation),
        title: conversation?.title === "New conversation"
          ? conversationTitle(text)
          : conversation?.title ?? conversationTitle(text),
        updatedAt: reply.assistantMessage.createdAt,
      };
      setConversations((current) => upsertConversation(current, updatedConversation));
    } catch (cause) {
      if (!conversationId || activeConversationRef.current === conversationId) {
        setMessages((current) => failOptimisticMessage(current, clientMessageId));
        setError(getErrorMessage(cause, "Gemini could not answer. Try again."));
      }
    } finally {
      setSending(false);
    }
  }

  async function deleteConversation(conversation: ChatConversation) {
    if (!window.confirm(`Delete “${conversation.title}”? This removes its messages.`)) return;

    try {
      await http.delete(`/api/ai/conversations/${conversation.id}`);
      const remaining = conversations.filter((item) => item.id !== conversation.id);
      setConversations(remaining);
      if (activeConversationRef.current === conversation.id) {
        const next = remaining[0] ?? null;
        activeConversationRef.current = next?.id ?? null;
        setActiveConversationId(next?.id ?? null);
        setMessages([]);
        setLoadingMessages(false);
        if (next) setResponseLanguage(next.targetLanguage === "en" ? "en" : "vi");
      }
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not delete this conversation."));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (draft.trim()) void sendMessage(draft);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] min-h-[28rem] w-full max-w-7xl overflow-hidden rounded-3xl border border-border bg-card shadow-sm md:h-[calc(100dvh-7rem)]">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-muted/20 md:flex md:flex-col">
        <div className="p-3">
          <Button type="button" variant="outline" className="w-full justify-start" onClick={startNewChat}>
            <Icon icon={Plus} />
            New chat
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
          {loadingConversations ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Loading conversations…</p>
          ) : conversations.length ? (
            <div className="grid gap-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-center rounded-2xl",
                    conversation.id === activeConversationId && "bg-accent",
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 px-3 py-2.5 text-left text-sm"
                    onClick={() => chooseConversation(conversation)}
                  >
                    <span className="block truncate font-medium">{conversation.title}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mr-1 size-8 shrink-0 opacity-60 hover:opacity-100"
                    aria-label={`Delete ${conversation.title}`}
                    onClick={() => void deleteConversation(conversation)}
                  >
                    <Icon icon={Trash} size="sm" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">Your conversations will appear here.</p>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3 sm:px-5">
          <div className="mr-auto min-w-0">
            <h1 className="truncate text-lg font-semibold">
              {activeConversation?.title ?? "New conversation"}
            </h1>
            <p className="text-xs text-muted-foreground">Powered by Gemini</p>
          </div>

          <div className="w-full md:hidden">
            <Select
              value={activeConversationId ?? "new"}
              onValueChange={(value) => {
                if (value === "new") startNewChat();
                else {
                  const selected = conversations.find((item) => item.id === value);
                  if (selected) chooseConversation(selected);
                }
              }}
            >
              <SelectTrigger className="h-9 w-full">
                {activeConversation?.title ?? "New chat"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New chat</SelectItem>
                {conversations.map((conversation) => (
                  <SelectItem key={conversation.id} value={conversation.id}>
                    {conversation.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select
            value={responseLanguage}
            onValueChange={(value) => {
              if (value === "vi" || value === "en") void updateResponseLanguage(value);
            }}
          >
            <SelectTrigger className="h-9 w-auto min-w-32">
              {responseLanguage === "vi" ? "Vietnamese" : "English"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vi">Vietnamese</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>

          <CreateFlashcardDialog
            books={books}
            triggerLabel="Save vocabulary"
            triggerClassName="h-9"
          />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loadingMessages ? (
            <div className="grid min-h-full place-items-center p-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Icon icon={Spinner} className="animate-spin" />
                Loading messages…
              </span>
            </div>
          ) : messages.length ? (
            <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" && "justify-end",
                  )}
                >
                  {message.role === "assistant" ? (
                    <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Icon icon={ChatCircleText} size="sm" />
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6",
                      message.role === "user" && "whitespace-pre-wrap",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                      message.status === "failed" && "border border-destructive/40",
                    )}
                  >
                    {message.role === "assistant" ? (
                      <ChatMessageContent content={message.content} />
                    ) : (
                      message.content
                    )}
                    {message.status === "sending" ? (
                      <span className="mt-2 flex items-center gap-1.5 text-xs opacity-75">
                        <Icon icon={Spinner} size="sm" className="animate-spin" />
                        Sending
                      </span>
                    ) : null}
                    {message.status === "failed" && message.clientMessageId ? (
                      <button
                        type="button"
                        className="mt-2 block text-xs font-semibold underline underline-offset-2"
                        onClick={() =>
                          void sendMessage(
                            message.content,
                            message.clientMessageId,
                            activeConversationId ?? undefined,
                          )
                        }
                      >
                        Retry
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
              {sending && messages.at(-1)?.status !== "sending" ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon icon={Spinner} className="animate-spin" />
                  Gemini is writing…
                </p>
              ) : null}
              <div ref={threadEndRef} />
            </div>
          ) : (
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-5 py-10 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
                <Icon icon={ChatCircleText} size="lg" />
              </span>
              <h2 className="mt-4 text-2xl font-semibold">How can I help you learn English?</h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Ask about grammar, vocabulary, pronunciation, writing, or everyday English.
              </p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-3">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-2xl border border-border bg-background p-3 text-left text-sm transition-colors hover:bg-accent"
                    onClick={() => setDraft(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-card px-3 py-3 sm:px-5">
          {error ? (
            <Alert variant="destructive" className="mx-auto mb-3 max-w-3xl">
              <WarningCircle />
              <AlertTitle>Chat request failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <form className="mx-auto flex max-w-3xl items-end gap-2" onSubmit={handleSubmit}>
            <Textarea
              aria-label="Message Gemini"
              value={draft}
              maxLength={5000}
              rows={1}
              className="min-h-11 resize-none rounded-2xl"
              placeholder="Message FLENVN…"
              disabled={sending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
            />
            <Button
              type="submit"
              size="icon"
              className="size-11 shrink-0 rounded-full"
              aria-label="Send message"
              disabled={sending || !draft.trim()}
            >
              {sending ? (
                <Icon icon={Spinner} className="animate-spin" />
              ) : (
                <Icon icon={PaperPlaneTilt} />
              )}
            </Button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
            Gemini can make mistakes. Check important answers.
          </p>
        </div>
      </section>
    </div>
  );
}
