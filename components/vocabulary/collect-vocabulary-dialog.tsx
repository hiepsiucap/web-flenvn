"use client";

import { Spinner } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  language,
  disabled,
  triggerClassName = "",
}: {
  conversationId: string | null;
  conversationRevision: string | null;
  language: string;
  disabled: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Source>("conversation");
  const [topic, setTopic] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState("");
  const [booksError, setBooksError] = useState("");
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [busy, setBusy] = useState<"discover" | "save" | null>(null);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const conversationResults = useRef(new Map<string, Item[]>());
  const requestId = useRef(0);

  const cacheKey = conversationId && conversationRevision
    ? `${conversationId}:${conversationRevision}:${language}`
    : null;

  function showConversation(id: string) {
    const cached = cacheKey ? conversationResults.current.get(cacheKey) : undefined;
    setMode("conversation");
    setMessage("");
    setSummary("");
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
      setBookId((current) =>
        loaded.some((book) => book.id === current) ? current : "",
      );
    } catch (error) {
      setBooks([]);
      setBookId("");
      setBooksError(errorMessage(error));
    } finally {
      setLoadingBooks(false);
    }
  }

  async function discover(source: Source, id = conversationId) {
    if (source === "topic" && !topic.trim()) {
      setMessage("Enter a topic first.");
      return;
    }
    if (source === "conversation" && !id) return;
    const currentRequest = ++requestId.current;
    setBusy("discover");
    setEditingKey(null);
    setItems([]);
    setMessage("");
    setSummary("");
    try {
      const path =
        source === "conversation"
          ? `/api/ai/conversations/${id}/vocabulary/discover`
          : "/api/ai/conversations/vocabulary/topic";
      const response = await http.post<
        ApiEnvelope<{ candidates: Candidate[] }> | { candidates: Candidate[] }
      >(
        path,
        source === "topic"
          ? { topic: topic.trim(), targetLanguage: language }
          : {},
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

  const eligible = items.filter(
    (item) =>
      item.selected &&
      !item.alreadyExists &&
      item.status !== "saved" &&
      item.status !== "duplicate",
  );
  const editingItem = items.find((item) => item.key === editingKey);
  const valid = eligible.filter(
    (item) =>
      item.text.trim() && item.translation.trim() && item.definition.trim(),
  );

  async function save() {
    if (!bookId || !valid.length || busy) return;
    setBusy("save");
    setMessage("");
    setSummary("");
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
      setSummary(
        `${result.saved} saved, ${result.duplicates} duplicates, ${result.failed} failed.`,
      );
      if (result.saved) notifyClientDataChanged();
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
        Collect vocabulary
      </Button>
      <Modal open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          requestId.current += 1;
          setEditingKey(null);
        }
      }}>
        <ModalContent
          className={cn(
            "h-[calc(100dvh-1rem)] sm:max-w-4xl",
            editingItem && "pointer-events-none blur-[2px]",
          )}
        >
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
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Discovery source"
            >
              <Button
                type="button"
                variant={mode === "conversation" ? "default" : "ghost"}
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
                aria-pressed={mode === "topic"}
                onClick={() => {
                  requestId.current += 1;
                  setBusy(null);
                  setMode("topic");
                  setItems([]);
                  setMessage("");
                }}
              >
                From topic
              </Button>
            </div>
            {mode === "topic" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="collector-topic">Topic</Label>
                <Input
                  id="collector-topic"
                  value={topic}
                  maxLength={120}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Travel conversations"
                />
              </div>
            ) : null}
            {mode === "topic" ? <Button
              type="button"
              variant="default"
              disabled={!!busy}
              onClick={() => void discover("topic")}
            >
              Find words for topic
            </Button> : null}
            {busy === "discover" ? (
              <div role="status" aria-live="polite" className="grid gap-3">
                <div className="flex min-h-8 items-center gap-2 text-sm font-medium">
                  <Spinner className="size-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                  <span>Finding useful vocabulary from {mode === "conversation" ? "your conversation" : "your topic"}…</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="flex min-h-44 flex-col rounded-3xl border-2 border-border/30 bg-card p-4 shadow-md shadow-foreground/10">
                      <div className="flex gap-4">
                        <Skeleton className="size-6 shrink-0 rounded-full" />
                        <Skeleton className="size-20 shrink-0 rounded-2xl sm:size-24" />
                        <div className="flex min-w-0 flex-1 flex-col gap-3 py-1">
                          <Skeleton className="h-5 w-1/3 rounded-full" />
                          <Skeleton className="h-4 w-2/3 rounded-full" />
                          <Skeleton className="h-4 w-full rounded-full" />
                        </div>
                      </div>
                      <Skeleton className="mt-auto h-7 w-24 rounded-full" />
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
            {items.length ? (
              <>
                <div className="flex flex-wrap gap-2">
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
                <div className="grid gap-3 md:auto-rows-fr md:grid-cols-2">
                  {items.map((item) => (
                    <article
                      key={item.key}
                      className={cn(
                        "flex h-full flex-col rounded-3xl border-2 border-border/30 bg-card p-4 shadow-md shadow-foreground/10 transition-shadow",
                        !item.alreadyExists && item.status !== "saved" && item.status !== "duplicate" &&
                          "cursor-pointer hover:shadow-lg hover:shadow-foreground/10",
                      )}
                      onClick={(event) => {
                        if (item.alreadyExists || item.status === "saved" || item.status === "duplicate") return;
                        if (!(event.target instanceof Element)) return;
                        if (event.target.closest("button, input, textarea, select, a, details, [role='checkbox'], [role='combobox']")) return;
                        update(item.key, { selected: !item.selected });
                      }}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                          <Checkbox
                            aria-label={`Save ${item.text}`}
                            className="size-6 rounded-full [&_[data-slot=checkbox-indicator]>svg]:size-4"
                            checked={item.selected}
                            disabled={
                              item.alreadyExists ||
                              item.status === "saved" ||
                              item.status === "duplicate"
                            }
                            onCheckedChange={(checked) =>
                              update(item.key, { selected: checked === true })
                            }
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {item.alreadyExists || item.status === "saved" || item.status === "duplicate"
                              ? "Saved"
                              : "Save"}
                          </span>
                        </div>
                        {item.imageUrl ? (
                          <div
                            className="size-20 shrink-0 rounded-2xl bg-card bg-cover bg-center sm:size-24"
                            role="img"
                            aria-label={`Picture for ${item.text}`}
                            style={{ backgroundImage: `url(${item.imageUrl})` }}
                          />
                        ) : (
                          <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-card p-2 text-center text-[11px] text-muted-foreground sm:size-24">
                            No picture
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-base font-semibold">{item.text}</h3>
                            <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                              {item.type.replaceAll("_", " ")}
                            </span>
                          </div>
                          <p className="mt-1 break-words text-sm font-medium">{item.translation}</p>
                          <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">
                            {item.definition}
                          </p>
                          {item.example ? (
                            <p className="mt-2 line-clamp-2 break-words text-xs italic text-muted-foreground">
                              “{item.example}”
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{item.source === "topic" ? "Related to topic" : "From conversation"}</span>
                            {item.recommended ? <span>Recommended</span> : null}
                            {item.alreadyExists || item.status === "duplicate" ? (
                              <span>Already saved{item.existingBookTitle ? ` in ${item.existingBookTitle}` : ""}</span>
                            ) : null}
                            {item.status === "saved" ? <span>Saved</span> : null}
                            {item.status === "failed" ? (
                              <span className="text-destructive">Failed: {item.error}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-auto self-start"
                        aria-label={`Edit details for ${item.text}`}
                        onClick={() => setEditingKey(item.key)}
                      >
                        Edit details
                      </Button>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
            {eligible.length > valid.length ? (
              <p role="alert" className="text-sm text-destructive">
                Fill in the word or phrase, translation, and definition for each
                selected card.
              </p>
            ) : null}
            {summary ? (
              <p role="status" className="text-sm">
                {summary}
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
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
        {editingItem ? (
          <Modal open={open} onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditingKey(null);
          }}>
            <ModalContent className="sm:max-w-2xl">
              <ModalHeader>
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
                            className="aspect-square rounded-xl bg-muted bg-cover bg-center ring-2 ring-transparent focus-visible:outline-2 focus-visible:outline-ring aria-pressed:ring-primary"
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
        </ModalContent>
      </Modal>
    </>
  );
}
