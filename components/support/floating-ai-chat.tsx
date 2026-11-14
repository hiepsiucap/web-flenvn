"use client";

import { ChatCircleText, PaperPlaneTilt, Spinner, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { CollectVocabularyDialog } from "@/components/vocabulary/collect-vocabulary-dialog";
import { ChatMessageContent } from "@/components/vocabulary/chat-message-content";
import {
  type ChatMessage,
  type PersistedChatMessage,
  createOptimisticMessage,
  failOptimisticMessage,
  resolveOptimisticMessage,
} from "@/lib/conversational-chat";
import { shouldShowMobileDashboardNavigation } from "@/lib/dashboard-layout";
import { HttpError, http } from "@/lib/http";
import { cn } from "@/lib/utils";

type Reply = { userMessage: PersistedChatMessage; assistantMessage: PersistedChatMessage };
function unwrap<T>(response: T | { data: T }): T {
  return response && typeof response === "object" && "data" in response ? response.data : response as T;
}

export function FloatingAiChat() {
  const pathname = usePathname();
  const aboveNavigation = shouldShowMobileDashboardNavigation(pathname);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const locked = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const failed = messages.find((message) => message.status === "failed");
  const lastReply = messages.findLast((message) => message.role === "assistant" && message.status === "sent");

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, messages, sending]);

  async function send(content: string, clientMessageId = crypto.randomUUID()) {
    const text = content.trim();
    if (!text || text.length > 5000 || locked.current) return;
    locked.current = true;
    setSending(true);
    setError("");
    setDraft("");
    setMessages((current) => current.some((message) => message.clientMessageId === clientMessageId)
      ? current.map((message) => message.clientMessageId === clientMessageId ? { ...message, status: "sending" } : message)
      : [...current, createOptimisticMessage(text, clientMessageId)]);
    let activeConversationId = conversationId;
    try {
      if (!activeConversationId) {
        const conversation = unwrap(await http.post<{ id: string } | { data: { id: string } }>(
          "/api/ai/conversations", { title: "Quick AI chat", targetLanguage: "en" },
        ));
        activeConversationId = conversation.id;
        setConversationId(conversation.id);
      }
      const reply = unwrap(await http.post<Reply | { data: Reply }>(
        `/api/ai/conversations/${activeConversationId}/messages`,
        { message: text, clientMessageId },
      ));
      setMessages((current) => resolveOptimisticMessage(current, clientMessageId, reply.userMessage, reply.assistantMessage));
    } catch (cause) {
      setMessages((current) => failOptimisticMessage(current, clientMessageId));
      const detail = cause instanceof HttpError ? (cause.data as { message?: string } | null)?.message : null;
      setError(typeof detail === "string" ? detail : "Your message couldn’t be sent. Please try again.");
    } finally {
      locked.current = false;
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger render={
        <Button
          type="button"
          size="icon-lg"
          aria-label={open ? "Toggle AI chat" : "Open AI chat"}
          className={cn(
            "fixed right-4 z-40 size-14 rounded-full border border-border shadow-lg shadow-foreground/10 sm:right-6 lg:bottom-6",
            aboveNavigation ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
          )}
        >
          <Icon icon={ChatCircleText} className="size-6" weight="fill" />
        </Button>
      } />
      <DialogContent
        showCloseButton={false}
        overlayClassName="hidden"
        initialFocus={inputRef}
        className={cn(
          "fixed inset-auto right-4 top-auto left-auto z-40 flex h-[min(30rem,calc(100dvh-11rem-env(safe-area-inset-bottom)))] w-[calc(100vw-2rem)] max-w-sm translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-xl shadow-foreground/10 sm:right-6 sm:max-w-sm lg:bottom-24 lg:h-[min(32rem,calc(100dvh-8rem))]",
          aboveNavigation ? "bottom-[calc(10rem+env(safe-area-inset-bottom))]" : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <DialogTitle className="text-base font-bold">AI chat</DialogTitle>
            <DialogDescription className="mt-0.5 text-xs font-normal">Your English learning assistant</DialogDescription>
          </div>
          <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Close AI chat" />}>
            <Icon icon={X} />
          </DialogClose>
        </header>
        <div role="log" aria-label="AI conversation" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {!messages.length ? (
            <p className="py-4 text-sm leading-relaxed text-muted-foreground">Hi! Ask me about a word, grammar, or a sentence you’re learning.</p>
          ) : messages.map((message) => (
            <div key={message.id} className={cn("max-w-[92%] rounded-2xl px-3 py-2 text-sm", message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-muted/40")}>
              <span className="sr-only">{message.role === "user" ? "You" : "AI assistant"}: </span>
              <ChatMessageContent content={message.content} />
              {message.status === "failed" ? <p className="mt-1 text-xs">Not sent</p> : null}
            </div>
          ))}
          {sending ? <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Icon icon={Spinner} className="animate-spin motion-reduce:animate-none" />Thinking…</p> : null}
          <div ref={endRef} />
        </div>
        {error ? (
          <div className="shrink-0 px-4 pb-2">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            {failed ? <Button type="button" variant="ghost" size="sm" disabled={sending} onClick={() => void send(failed.content, failed.clientMessageId)}>Retry message</Button> : null}
          </div>
        ) : null}
        {lastReply ? (
          <div className="shrink-0 border-t border-border px-3 pt-2">
            <CollectVocabularyDialog
              conversationId={conversationId}
              conversationRevision={lastReply.id}
              disabled={sending || Boolean(failed)}
              triggerLabel="Save flashcards"
              triggerClassName="h-8 w-full border border-border bg-background text-xs text-foreground hover:bg-muted"
            />
          </div>
        ) : null}
        <form className="flex shrink-0 items-end gap-2 p-3" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
          <Textarea
            ref={inputRef}
            aria-label="Message AI assistant"
            placeholder="Ask a question…"
            rows={1}
            maxLength={5000}
            value={draft}
            disabled={sending || Boolean(failed)}
            className="max-h-28 min-h-10 resize-none rounded-xl"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!sending && !failed) void send(draft);
              }
            }}
          />
          <Button type="submit" size="icon" aria-label="Send message" disabled={sending || Boolean(failed) || !draft.trim()}>
            <Icon icon={PaperPlaneTilt} />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
