"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ApiEnvelope } from "@/lib/auth-types";
import { getBooksClient, notifyClientDataChanged } from "@/lib/client-api";
import type { Book, Flashcard } from "@/lib/dashboard-data";
import { HttpError, http } from "@/lib/http";
import { buildFirstFollowUpMessage, runVocabularySearch } from "@/lib/vocabulary-chat-flow";

type CardDraft = Pick<Flashcard, "word" | "definition" | "translation" | "example" | "exampleTranslation" | "bookId">;
type SearchResult = {
  word: string;
  language: "en" | "vi";
  definition: string;
  translation: string;
  example: string;
  answer: string;
  draft: CardDraft;
  save: { status: "pending" | "existing"; flashcardId?: string; bookId?: string | null };
};
type SaveState = { status: "idle" | "saving" | "saved" | "existing" | "failed"; flashcardId?: string; bookId?: string | null; message?: string };
type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatReply = { assistantMessage: { content: string } };

function unwrap<T>(response: ApiEnvelope<T> | T): T {
  return response && typeof response === "object" && "data" in response && "success" in response
    ? response.data
    : response as T;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    const data = error.data as { message?: string } | null;
    return data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export function VocabularyChat() {
  const [books, setBooks] = useState<Book[]>([]);
  const [booksError, setBooksError] = useState("");
  const [booksLoading, setBooksLoading] = useState(true);
  const [word, setWord] = useState("");
  const [language, setLanguage] = useState<"en" | "vi">("en");
  const [context, setContext] = useState("");
  const [bookId, setBookId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchedContext, setSearchedContext] = useState("");
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"idle" | "explaining" | "replying">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getBooksClient().then((items) => {
      if (!active) return;
      setBooks(items);
      setBookId((current) => current || items[0]?.id || "");
      setBooksError("");
      setBooksLoading(false);
    }).catch(() => {
      if (active) {
        setBooksError("Books could not be loaded. Try reloading this page.");
        setBooksLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  async function saveCard(draft: CardDraft) {
    setSave({ status: "saving" });
    try {
      const response = await http.post<ApiEnvelope<Flashcard> | Flashcard>("/api/flashcards", draft);
      const card = unwrap(response);
      setSave({ status: "saved", flashcardId: card.id, bookId: card.bookId });
      notifyClientDataChanged();
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 409) {
        const details = (cause.data as { details?: { existingFlashcardId?: string; flashcard?: Flashcard } } | null)?.details;
        if (details?.existingFlashcardId) {
          setSave({ status: "existing", flashcardId: details.existingFlashcardId, bookId: details.flashcard?.bookId });
          return;
        }
      }
      setSave({ status: "failed", message: errorMessage(cause, "Could not save flashcard.") });
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy !== "idle" || save.status === "saving" || booksError || booksLoading) return;
    setBusy("explaining");
    setError("");
    setResult(null);
    setSave({ status: "idle" });
    setMessages([{ role: "user", content: `${word.trim()}${context.trim() ? ` — ${context.trim()}` : ""}` }]);
    setConversationId(null);

    try {
      const found = await runVocabularySearch(
        { word, language, context, bookId },
        books,
        async () => {
          const response = await http.post<ApiEnvelope<Book> | Book>("/api/books", { title: "Vocabulary", isPublic: false });
          const created = unwrap(response);
          setBooks((current) => [...current, created]);
          setBookId(created.id);
          notifyClientDataChanged();
          return created;
        },
        async (input) => {
          const response = await http.post<ApiEnvelope<SearchResult> | SearchResult>("/api/words/vocabulary-search", input);
          return unwrap(response);
        },
      );
      setResult(found);
      setSearchedContext(context.trim());
      setBookId(found.draft.bookId || bookId);
      setMessages((current) => [...current, { role: "assistant", content: found.answer }]);
      if (found.save.status === "existing") {
        setSave({ status: "existing", flashcardId: found.save.flashcardId, bookId: found.save.bookId });
      } else {
        await saveCard(found.draft);
      }
    } catch (cause) {
      setError(errorMessage(cause, "Could not explain this term. Try again."));
    } finally {
      setBusy("idle");
    }
  }

  async function handleFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!result || !text || busy !== "idle") return;
    setBusy("replying");
    setError("");
    try {
      let id = conversationId;
      if (!id) {
        const response = await http.post<ApiEnvelope<{ id: string }> | { id: string }>("/api/ai/conversations", {
          title: result.word,
          targetLanguage: result.language === "en" ? "vi" : "en",
        });
        id = unwrap(response).id;
        setConversationId(id);
      }
      const message = conversationId
        ? text
        : buildFirstFollowUpMessage({ word: result.word, context: searchedContext, answer: result.answer }, text);
      const response = await http.post<ApiEnvelope<ChatReply> | ChatReply>(`/api/ai/conversations/${id}/messages`, {
        message,
        clientMessageId: crypto.randomUUID(),
      });
      const reply = unwrap(response);
      setMessages((current) => [...current, { role: "user", content: text }, { role: "assistant", content: reply.assistantMessage.content }]);
      setQuestion("");
    } catch (cause) {
      setError(errorMessage(cause, "Could not answer the follow-up. Try again."));
    } finally {
      setBusy("idle");
    }
  }

  const cardLink = save.bookId
    ? `/flashcards?bookId=${encodeURIComponent(save.bookId)}&word=${encodeURIComponent(result?.word || "")}`
    : null;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-5 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold">Vocabulary chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search a word in English or Vietnamese. Your searched word becomes a flashcard.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search a word or phrase</CardTitle>
          <CardDescription>Add a sentence to get the meaning that fits your context.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vocabulary-word">Word or phrase</Label>
              <Input id="vocabulary-word" value={word} onChange={(event) => setWord(event.target.value)} maxLength={100} required placeholder="bank" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Word language</Label>
                <Select value={language} onValueChange={(value) => { if (value === "en" || value === "vi") setLanguage(value); }}>
                  <SelectTrigger aria-label="Word language" className="h-10 w-full">{language === "en" ? "English" : "Vietnamese"}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="vi">Vietnamese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Save to book</Label>
                {booksLoading ? <p className="flex h-10 items-center text-sm text-muted-foreground">Loading books…</p> : books.length ? (
                  <Select value={bookId} onValueChange={(value) => { if (value) setBookId(value); }}>
                    <SelectTrigger aria-label="Book to save flashcard" className="h-10 w-full">{books.find((book) => book.id === bookId)?.title || "Choose a book"}</SelectTrigger>
                    <SelectContent>{books.map((book) => <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <p className="flex h-10 items-center text-sm text-muted-foreground">A private Vocabulary book will be created.</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vocabulary-context">Context or example (optional)</Label>
              <Textarea id="vocabulary-context" value={context} onChange={(event) => setContext(event.target.value)} maxLength={2000} placeholder="She went to the bank." />
            </div>
            {booksError ? <p role="alert" className="text-sm text-destructive">{booksError}</p> : null}
            <Button type="submit" disabled={busy !== "idle" || save.status === "saving" || Boolean(booksError) || booksLoading} className="w-fit">
              {save.status === "saving" ? "Saving…" : busy === "explaining" ? "Explaining…" : "Search and save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {messages.length ? <Card>
        <CardHeader><CardTitle>Conversation</CardTitle></CardHeader>
        <CardContent className="grid gap-4" aria-live="polite">
          {messages.map((message, index) => (
            <div key={index} className="rounded-xl border border-border p-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{message.role === "user" ? "You" : "FLENVN"}</p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
          {busy === "explaining" ? <p role="status" className="text-sm text-muted-foreground">Finding the meaning…</p> : null}
          {busy === "replying" ? <p role="status" className="text-sm text-muted-foreground">Writing a reply…</p> : null}
        </CardContent>
      </Card> : null}

      {result ? <Card>
        <CardHeader><CardTitle>Flashcard for {result.word}</CardTitle><CardDescription>{result.definition}{result.translation ? ` · ${result.translation}` : ""}</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm"><span className="font-medium">Example:</span> {result.example}</p>
          <div aria-live="polite" className="text-sm">
            {save.status === "saving" ? "Saving flashcard…" : null}
            {save.status === "saved" ? "Saved as a flashcard." : null}
            {save.status === "existing" ? "Already saved. Your existing flashcard was not changed." : null}
            {save.status === "failed" ? <span role="alert">Explanation ready, but the flashcard was not saved: {save.message}</span> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {cardLink && (save.status === "saved" || save.status === "existing") ? <Button render={<Link href={cardLink} />} nativeButton={false} variant="outline">View or edit flashcard</Button> : null}
            {save.status === "failed" ? <Button type="button" onClick={() => void saveCard(result.draft)}>Retry save</Button> : null}
          </div>
        </CardContent>
      </Card> : null}

      {result ? <Card>
        <CardHeader><CardTitle>Ask a follow-up</CardTitle><CardDescription>Questions about this word will not create another flashcard.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={handleFollowUp} className="flex flex-col gap-3 sm:flex-row">
            <Input aria-label="Follow-up question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={5000} placeholder="Can I use it as a verb?" required />
            <Button type="submit" disabled={busy !== "idle"} className="sm:shrink-0">Ask</Button>
          </form>
        </CardContent>
      </Card> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
