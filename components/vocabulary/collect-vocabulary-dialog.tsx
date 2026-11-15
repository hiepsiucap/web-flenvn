"use client";

import { ArrowLeft, CaretRight, Image as ImageIcon, Spinner } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { VocabularySaveResult } from "@/components/vocabulary/vocabulary-save-result";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { ApiEnvelope } from "@/lib/auth-types";
import { getBooksClient, notifyClientDataChanged } from "@/lib/client-api";
import type { Book } from "@/lib/dashboard-data";
import { chooseSaveBook, readBookSaveCounts, recordBookSave } from "@/lib/book-save-preference";
import { HttpError, http } from "@/lib/http";
import { cn } from "@/lib/utils";

const types = [
  "word",
  "phrase",
  "phrasal_verb",
  "collocation",
  "idiom",
  "sentence_pattern",
] as const;
type CandidateType = (typeof types)[number];
type Source = "conversation" | "topic";
type Candidate = {
  text: string;
  type: CandidateType;
  translation: string;
  definition: string;
  example?: string;
  imageUrl?: string | null;
  recommended?: boolean;
  source: Source;
  alreadyExists: boolean;
  existingBookTitle: string | null;
};
type Item = Candidate & {
  key: number;
  selected: boolean;
  imageSuggestions?: string[];
  imageLoading?: boolean;
  imageError?: string;
  status?: "saved" | "duplicate" | "failed";
  error?: string;
};
type SaveResult = {
  saved: number;
  duplicates: number;
  failed: number;
  results: {
    text: string;
    status: "saved" | "duplicate" | "failed";
    error?: string;
  }[];
};

function unwrap<T>(response: ApiEnvelope<T> | T): T {
  return response &&
    typeof response === "object" &&
    "data" in response &&
    "success" in response
    ? response.data
    : (response as T);
}

function errorMessage(error: unknown) {
  if (error instanceof HttpError) {
    const data = error.data as { message?: string | string[] } | null;
    if (Array.isArray(data?.message)) return data.message.join(" ");
    if (data?.message) return data.message;
  }
  return error instanceof Error ? error.message : "Request failed. Try again.";
}

export function CollectVocabularyDialog({
  conversationId,
  conversationRevision,
  disabled,
  triggerClassName = "",
  triggerLabel = "Collect vocabulary",
}: {
  conversationId: string | null;
  conversationRevision: string | null;
  disabled: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Source>("conversation");
  const [items, setItems] = useState<Item[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState("");
  const [booksError, setBooksError] = useState("");
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [busy, setBusy] = useState<"discover" | "save" | null>(null);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<SaveResult | null>(null);
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const conversationResults = useRef(new Map<string, Item[]>());
  const requestId = useRef(0);

  const cacheKey = conversationId && conversationRevision
    ? `${conversationId}:${conversationRevision}:vi`
    : null;

  function showConversation(id: string) {
    const cached = cacheKey ? conversationResults.current.get(cacheKey) : undefined;
    setMode("conversation");
    setMessage("");
    setSummary(null);
    if (cached) {
      requestId.current += 1;
      setBusy(null);
      setItems(cached);
    } else {
      setItems([]);
      void discover("conversation", id);
    }
  }

  async function loadBooks() {
    setBooksError("");
    setLoadingBooks(true);
    try {
      const loaded = await getBooksClient();
      setBooks(loaded);
      setBookId(chooseSaveBook(loaded, readBookSaveCounts()));
    } catch (error) {
      setBooks([]);
      setBookId("");
      setBooksError(errorMessage(error));
    } finally {
      setLoadingBooks(false);
    }
  }

  async function discover(source: Source, id = conversationId) {
    if (!id) return;
    const currentRequest = ++requestId.current;
    setBusy("discover");
    setEditingKey(null);
    setItems([]);
    setMessage("");
    setSummary(null);
    try {
      const path =
        source === "conversation"
          ? `/api/ai/conversations/${id}/vocabulary/discover`
          : `/api/ai/conversations/${id}/vocabulary/topic`;
      const response = await http.post<
        ApiEnvelope<{ candidates: Candidate[] }> | { candidates: Candidate[] }
      >(
        path,
        {},
      );
      const candidates = unwrap(response).candidates;
      if (currentRequest !== requestId.current) return;
      const discovered = candidates.map((candidate, key) => ({
          ...candidate,
          key,
          selected: !candidate.alreadyExists,
        }));
      setItems(discovered);
      if (source === "conversation" && id && cacheKey)
        conversationResults.current.set(cacheKey, discovered);
      if (!candidates.length)
        setMessage(
          "No useful vocabulary found. Try a topic or return to the conversation.",
        );
    } catch (error) {
      if (currentRequest === requestId.current) setMessage(errorMessage(error));
    } finally {
      if (currentRequest === requestId.current) setBusy(null);
    }
  }

  function update(key: number, patch: Partial<Item>) {
    setItems((current) => {
      const next = current.map((item) =>
        item.key === key ? { ...item, ...patch } : item,
      );
      if (mode === "conversation" && cacheKey)
        conversationResults.current.set(cacheKey, next);
      return next;
    });
  }

  function selectMatching(predicate: (item: Item) => boolean) {
    setItems((current) => {
      const next = current.map((item) => ({
        ...item,
        selected:
          item.alreadyExists ||
          item.status === "saved" ||
          item.status === "duplicate"
            ? false
            : predicate(item),
      }));
      if (mode === "conversation" && cacheKey)
        conversationResults.current.set(cacheKey, next);
      return next;
    });
  }

  async function findPictures(item: Item) {
    if (!item.text.trim() || item.imageLoading) return;
    update(item.key, { imageLoading: true, imageError: "" });
    try {
      const response = await http.get<
        ApiEnvelope<{ images?: { url?: string }[] }>
      >("/api/flashcards/images/suggest", {
        query: { word: item.text.trim(), limit: 6 },
      });
      const images = response.data.images
        ?.map((image) => image.url)
        .filter((url): url is string => Boolean(url)) ?? [];
      update(item.key, {
        imageSuggestions: images,
        imageError: images.length ? "" : "No pictures found for this word.",
      });
    } catch (error) {
      update(item.key, { imageError: errorMessage(error) });
    } finally {
      update(item.key, { imageLoading: false });
    }
  }

  const unsavedItems = items.filter(
    (item) =>
      !item.alreadyExists &&
      item.status !== "saved" &&
      item.status !== "duplicate",
  );
  const eligible = unsavedItems.filter((item) => item.selected);
  const editingItem = items.find((item) => item.key === editingKey);
  const valid = eligible.filter(
    (item) =>
      item.text.trim() && item.translation.trim() && item.definition.trim(),
  );

  async function save() {
    if (!bookId || !valid.length || busy) return;
    setBusy("save");
    setMessage("");
    setSummary(null);
    try {
      const response = await http.post<ApiEnvelope<SaveResult> | SaveResult>(
        "/api/ai/conversations/vocabulary/save",
        {
          bookId,
          candidates: valid.map(
            ({ text, type, translation, definition, example, imageUrl }) => ({
              text,
              type,
              translation,
              definition,
              example,
              imageUrl: imageUrl || undefined,
            }),
          ),
        },
      );
      const result = unwrap(response);
      setItems((current) => {
        const next = [...current];
        valid.forEach((submitted, index) => {
          const position = next.findIndex((item) => item.key === submitted.key);
          if (position < 0) return;
          const outcome = result.results[index];
          if (!outcome) return;
          next[position] = {
            ...next[position],
            status: outcome.status,
            selected: outcome.status === "failed",
            error: outcome.error,
          };
        });
        if (mode === "conversation" && cacheKey)
          conversationResults.current.set(cacheKey, next);
        return next;
      });
      setSummary(result);
      if (result.saved) {
        recordBookSave(bookId);
        notifyClientDataChanged();
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button
        type="button"
        className={triggerClassName}
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          if (conversationId) showConversation(conversationId);
          void loadBooks();
        }}
      >
        {triggerLabel}
      </Button>
      <Modal open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          requestId.current += 1;
          setEditingKey(null);
        }
      }}>
        <ModalContent className="h-[calc(100dvh-1rem)] sm:max-w-4xl" forceOverlay overlayClassName="bg-background/40 supports-backdrop-filter:backdrop-blur-md">
          <ModalHeader>
            <ModalTitle>Collect vocabulary</ModalTitle>
            <ModalDescription>
              Review useful words and phrases before saving them to a book.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="content-start auto-rows-max">
            <div className="sticky top-0 z-10 -mx-2 bg-popover px-2 pb-3 pt-1">
              <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-4">
                <Label>Save to book</Label>
                {loadingBooks ? (
                  <p role="status" className="text-sm text-muted-foreground">Loading books…</p>
                ) : booksError ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-destructive" role="alert">
                    <span>Books could not be loaded: {booksError}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void loadBooks()}>
                      Retry
                    </Button>
                  </div>
                ) : books.length ? (
                  <Select value={bookId || null} onValueChange={(value) => setBookId(value ?? "")}>
                    <SelectTrigger aria-label="Destination book" className="w-full sm:max-w-sm">
                      {books.find((book) => book.id === bookId)?.title ?? "Select a book"}
                    </SelectTrigger>
                    <SelectContent>
                      {books.map((book) => (
                        <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <Link href="/books" className="font-medium text-primary underline">Create a book</Link> to save cards.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
              <div
                className="flex shrink-0 items-center gap-2"
                role="group"
                aria-label="Discovery source"
              >
                <Button
                  type="button"
                  variant={mode === "conversation" ? "default" : "ghost"}
                  className="border border-border"
                  aria-pressed={mode === "conversation"}
                  onClick={() => {
                    if (conversationId) showConversation(conversationId);
                  }}
                >
                  From conversation
                </Button>
                <Button
                  type="button"
                  variant={mode === "topic" ? "default" : "ghost"}
                  className="border border-border"
                  aria-pressed={mode === "topic"}
                  onClick={() => {
                    setMode("topic");
                    void discover("topic");
                  }}
                >
                  From topic
                </Button>
              </div>
            {unsavedItems.length ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => selectMatching(() => true)}
                  >
                    Select all eligible
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => selectMatching((item) => !!item.recommended)}
                  >
                    Select recommended
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => selectMatching(() => false)}
                  >
                    Clear selection
                  </Button>
                </div>
            ) : null}
            </div>
            {busy === "discover" ? (
              <div role="status" aria-live="polite" className="grid gap-3">
                <div className="flex min-h-8 items-center gap-2 text-sm font-medium">
                  <Spinner className="size-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                  <span>Finding useful vocabulary from {mode === "conversation" ? "your conversation" : "the chat’s topic"}…</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="flex min-h-36 items-start gap-3 rounded-2xl border border-border bg-card p-3">
                      <Skeleton className="h-24 w-18 shrink-0 rounded-xl" />
                      <div className="grid flex-1 gap-2">
                        <Skeleton className="h-4 w-2/3 rounded-full" />
                        <Skeleton className="h-3 w-1/3 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {message ? (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            ) : null}
            {unsavedItems.length ? (
              <>

                <div className="grid gap-3 md:grid-cols-2">
                  {unsavedItems.map((item) => (
                    <article
                      key={item.key}
                      className={cn(
                        "relative min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-foreground/5 transition-colors",
                        item.selected && "bg-primary/5",
                      )}
                    >
                      <Checkbox
                        aria-label={`Save ${item.text}`}
                        className="absolute right-3 top-3 z-10 size-5"
                        checked={item.selected}
                        onCheckedChange={(checked) =>
                          update(item.key, { selected: checked === true })
                        }
                      />
                      <button
                        type="button"
                        aria-label={`View details for ${item.text}`}
                        aria-haspopup="dialog"
                        className="grid min-h-36 w-full min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 rounded-2xl p-3 text-left outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 sm:grid-cols-[5rem_minmax(0,1fr)]"
                        onClick={() => setEditingKey(item.key)}
                      >
                        {item.imageUrl ? (
                          <span
                            role="img"
                            aria-label={`Picture for ${item.text}`}
                            className="h-24 w-full rounded-xl bg-muted bg-cover bg-center sm:h-28"
                            style={{ backgroundImage: `url(${item.imageUrl})` }}
                          />
                        ) : (
                          <span className="flex h-24 flex-col items-center justify-center gap-1 rounded-xl bg-muted/50 text-muted-foreground sm:h-28">
                            <ImageIcon aria-hidden="true" className="size-6" />
                            <span className="text-[10px]">Add a photo</span>
                          </span>
                        )}
                        <span className="grid min-w-0 gap-1">
                          <span className="block truncate pr-7 text-base font-semibold">{item.text}</span>
                          <span className="block truncate text-sm font-medium text-primary">{item.translation}</span>
                          <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.definition}</span>
                          <span className="mt-1 flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
                            <span className="truncate">{item.type.replaceAll("_", " ")}{item.recommended ? " · Recommended" : ""}</span>
                            <span className="inline-flex shrink-0 items-center gap-0.5">Details <CaretRight aria-hidden="true" className="size-3" /></span>
                          </span>
                          {item.status === "failed" ? (
                            <span className="block text-xs text-destructive">Failed: {item.error}</span>
                          ) : null}
                        </span>
                      </button>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
            {items.length > 0 && !unsavedItems.length && !busy && !summary ? (
              <div role="status" aria-live="polite">
                <EmptyState
                  illustration="books"
                  variant="panel"
                  title="All vocabulary saved"
                  description="All discovered words are already in your books. Try another topic or continue chatting to discover more."
                />
              </div>
            ) : null}
            {eligible.length > valid.length ? (
              <p role="alert" className="text-sm text-destructive">
                Fill in the word or phrase, translation, and definition for each
                selected card.
              </p>
            ) : null}
            {summary ? (
              <VocabularySaveResult
                saved={summary.saved}
                duplicates={summary.duplicates}
                failed={summary.failed}
                bookTitle={books.find((book) => book.id === bookId)?.title}
                allSaved={!unsavedItems.length}
              />
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to chat
            </Button>
            <Button
              type="button"
              disabled={
                !!busy ||
                loadingBooks ||
                !!booksError ||
                !bookId ||
                !valid.length ||
                eligible.length !== valid.length
              }
              onClick={() => void save()}
            >
              {busy === "discover"
                ? "Finding cards…"
                : busy === "save"
                  ? "Saving…"
                  : `Save ${valid.length} card${valid.length === 1 ? "" : "s"}`}
            </Button>
          </ModalFooter>
        </ModalContent>
          {editingItem ? (
          <Modal open onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditingKey(null);
          }}>
            <ModalContent className="sm:max-w-2xl" forceOverlay overlayClassName="bg-background/40 supports-backdrop-filter:backdrop-blur-md">
              <ModalHeader>
                <Button type="button" variant="ghost" size="sm" className="mb-2 w-fit justify-start px-0" onClick={() => setEditingKey(null)}>
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Back to vocabulary
                </Button>
                <ModalTitle>Edit card</ModalTitle>
                <ModalDescription>Update {editingItem.text} before saving.</ModalDescription>
              </ModalHeader>
              <ModalBody className="content-start auto-rows-max">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Picture</Label>
                    {editingItem.imageUrl ? (
                      <div
                        className="size-24 rounded-2xl bg-muted bg-cover bg-center"
                        role="img"
                        aria-label={`Picture for ${editingItem.text}`}
                        style={{ backgroundImage: `url(${editingItem.imageUrl})` }}
                      />
                    ) : (
                      <div className="flex size-24 items-center justify-center rounded-2xl bg-muted/40 p-2 text-center text-xs text-muted-foreground">
                        No picture
                      </div>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={editingItem.imageLoading || !editingItem.text.trim()}
                      onClick={() => void findPictures(editingItem)}
                    >
                      {editingItem.imageLoading ? "Finding pictures…" : "Find a picture"}
                    </Button>
                    {editingItem.imageUrl ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full"
                        onClick={() => update(editingItem.key, { imageUrl: null })}
                      >
                        Remove picture
                      </Button>
                    ) : null}
                    {editingItem.imageError ? (
                      <p role="alert" className="text-xs text-destructive">{editingItem.imageError}</p>
                    ) : null}
                    {editingItem.imageSuggestions?.length ? (
                      <div className="grid grid-cols-3 gap-1.5" aria-label={`Pictures for ${editingItem.text}`}>
                        {editingItem.imageSuggestions.map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            aria-label={`Choose picture ${index + 1} for ${editingItem.text}`}
                            aria-pressed={editingItem.imageUrl === url}
                            className="aspect-square rounded-xl bg-muted bg-cover bg-center ring-2 ring-transparent focus-visible:outline-2 focus-visible:outline-border aria-pressed:ring-border"
                            style={{ backgroundImage: `url(${url})` }}
                            onClick={() => update(editingItem.key, { imageUrl: url })}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor={`candidate-text-${editingItem.key}`}>
                      Word or phrase
                    </Label>
                    <Input
                      id={`candidate-text-${editingItem.key}`}
                      value={editingItem.text}
                      maxLength={100}
                      onChange={(event) =>
                        update(editingItem.key, {
                          text: event.target.value,
                          imageUrl: null,
                          imageSuggestions: [],
                          imageError: "",
                          alreadyExists: false,
                          status: undefined,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Type</Label>
                    <Select
                      value={editingItem.type}
                      onValueChange={(value) => {
                        if (types.includes(value as CandidateType))
                          update(editingItem.key, {
                            type: value as CandidateType,
                          });
                      }}
                    >
                      <SelectTrigger
                        aria-label={`Type for ${editingItem.text}`}
                        className="w-full"
                      >
                        {editingItem.type.replaceAll("_", " ")}
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`candidate-translation-${editingItem.key}`}>
                      Translation
                    </Label>
                    <Textarea
                      id={`candidate-translation-${editingItem.key}`}
                      value={editingItem.translation}
                      maxLength={2000}
                      onChange={(event) =>
                        update(editingItem.key, {
                          translation: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`candidate-definition-${editingItem.key}`}>
                      Definition
                    </Label>
                    <Textarea
                      id={`candidate-definition-${editingItem.key}`}
                      value={editingItem.definition}
                      maxLength={2000}
                      onChange={(event) =>
                        update(editingItem.key, {
                          definition: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1 sm:col-span-2">
                    <Label htmlFor={`candidate-example-${editingItem.key}`}>
                      Example
                    </Label>
                    <Textarea
                      id={`candidate-example-${editingItem.key}`}
                      value={editingItem.example ?? ""}
                      maxLength={2000}
                      onChange={(event) =>
                        update(editingItem.key, { example: event.target.value })
                      }
                    />
                  </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button type="button" onClick={() => setEditingKey(null)}>
                  Done
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        ) : null}
      </Modal>
    </>
  );
}
