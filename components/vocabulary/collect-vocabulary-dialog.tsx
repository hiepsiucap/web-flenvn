"use client";

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
import { Textarea } from "@/components/ui/textarea";
import type { ApiEnvelope } from "@/lib/auth-types";
import { getBooksClient, notifyClientDataChanged } from "@/lib/client-api";
import type { Book } from "@/lib/dashboard-data";
import { HttpError, http } from "@/lib/http";

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
        if (!nextOpen) requestId.current += 1;
      }}>
        <ModalContent className="h-[calc(100dvh-1rem)] sm:max-w-4xl">
          <ModalHeader>
            <ModalTitle>Collect vocabulary</ModalTitle>
            <ModalDescription>
              Review useful words and phrases before saving them to a book.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Discovery source"
            >
              <Button
                type="button"
                variant={mode === "conversation" ? "default" : "outline"}
                aria-pressed={mode === "conversation"}
                onClick={() => {
                  if (conversationId) showConversation(conversationId);
                }}
              >
                From conversation
              </Button>
              <Button
                type="button"
                variant={mode === "topic" ? "default" : "outline"}
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
              variant="outline"
              disabled={!!busy}
              onClick={() => void discover("topic")}
            >
              {busy === "discover" ? "Analyzing…" : "Find words for topic"}
            </Button> : null}
            {busy === "discover" && mode === "conversation" ? (
              <p role="status" className="text-sm text-muted-foreground">Analyzing conversation…</p>
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
                    variant="outline"
                    onClick={() => selectMatching(() => true)}
                  >
                    Select all eligible
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => selectMatching((item) => !!item.recommended)}
                  >
                    Select recommended
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => selectMatching(() => false)}
                  >
                    Clear selection
                  </Button>
                </div>
                <div className="grid gap-3">
                  {items.map((item) => (
                    <article
                      key={item.key}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                        <Checkbox
                          aria-label={`Select ${item.text}`}
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
                        <span className="text-xs text-muted-foreground">
                          {item.source === "topic"
                            ? "Related to topic"
                            : "From conversation"}
                        </span>
                        <span className="text-sm font-semibold">{item.text}</span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          {item.type.replaceAll("_", " ")}
                        </span>
                        {item.alreadyExists || item.status === "duplicate" ? (
                          <span className="text-xs font-medium">
                            Already saved
                            {item.existingBookTitle
                              ? ` in ${item.existingBookTitle}`
                              : ""}
                          </span>
                        ) : null}
                        {item.status === "saved" ? (
                          <span className="text-xs font-medium">Saved</span>
                        ) : null}
                        {item.status === "failed" ? (
                          <span className="text-xs text-destructive">
                            Failed: {item.error}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-[11rem_minmax(0,1fr)]">
                        <div className="space-y-2">
                          {item.imageUrl ? (
                            <div
                              className="aspect-square w-full rounded-lg border border-border bg-secondary bg-cover bg-center"
                              role="img"
                              aria-label={`Picture for ${item.text}`}
                              style={{ backgroundImage: `url(${item.imageUrl})` }}
                            />
                          ) : (
                            <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-secondary px-3 text-center text-xs text-muted-foreground">
                              No picture selected
                            </div>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={item.imageLoading || !item.text.trim()}
                            onClick={() => void findPictures(item)}
                          >
                            {item.imageLoading ? "Finding pictures…" : "Find a picture"}
                          </Button>
                          {item.imageUrl ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="w-full"
                              onClick={() => update(item.key, { imageUrl: null })}
                            >
                              Remove picture
                            </Button>
                          ) : null}
                          {item.imageError ? (
                            <p role="alert" className="text-xs text-destructive">{item.imageError}</p>
                          ) : null}
                          {item.imageSuggestions?.length ? (
                            <div className="grid grid-cols-3 gap-1.5" aria-label={`Pictures for ${item.text}`}>
                              {item.imageSuggestions.map((url, index) => (
                                <button
                                  key={`${url}-${index}`}
                                  type="button"
                                  aria-label={`Choose picture ${index + 1} for ${item.text}`}
                                  aria-pressed={item.imageUrl === url}
                                  className="aspect-square rounded-md border-2 border-border bg-secondary bg-cover bg-center focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-primary"
                                  style={{ backgroundImage: `url(${url})` }}
                                  onClick={() => update(item.key, { imageUrl: url })}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <Label htmlFor={`candidate-text-${item.key}`}>
                            Word or phrase
                          </Label>
                          <Input
                            id={`candidate-text-${item.key}`}
                            value={item.text}
                            maxLength={100}
                            onChange={(event) =>
                              update(item.key, {
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
                            value={item.type}
                            onValueChange={(value) => {
                              if (types.includes(value as CandidateType))
                                update(item.key, {
                                  type: value as CandidateType,
                                });
                            }}
                          >
                            <SelectTrigger
                              aria-label={`Type for ${item.text}`}
                              className="w-full"
                            >
                              {item.type.replaceAll("_", " ")}
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
                          <Label htmlFor={`candidate-translation-${item.key}`}>
                            Translation
                          </Label>
                          <Textarea
                            id={`candidate-translation-${item.key}`}
                            value={item.translation}
                            maxLength={2000}
                            onChange={(event) =>
                              update(item.key, {
                                translation: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`candidate-definition-${item.key}`}>
                            Definition
                          </Label>
                          <Textarea
                            id={`candidate-definition-${item.key}`}
                            value={item.definition}
                            maxLength={2000}
                            onChange={(event) =>
                              update(item.key, {
                                definition: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1 sm:col-span-2">
                          <Label htmlFor={`candidate-example-${item.key}`}>
                            Example
                          </Label>
                          <Textarea
                            id={`candidate-example-${item.key}`}
                            value={item.example ?? ""}
                            maxLength={2000}
                            onChange={(event) =>
                              update(item.key, { example: event.target.value })
                            }
                          />
                        </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
            {items.length ? (
              <div className="grid gap-2">
                <Label>Destination book</Label>
                {loadingBooks ? (
                  <p role="status" className="text-sm">
                    Loading books…
                  </p>
                ) : booksError ? (
                  <p role="alert" className="text-sm text-destructive">
                    Books could not be loaded: {booksError}{" "}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void loadBooks()}
                    >
                      Retry
                    </Button>
                  </p>
                ) : books.length ? (
                  <Select
                    value={bookId || null}
                    onValueChange={(value) => setBookId(value ?? "")}
                  >
                    <SelectTrigger
                      aria-label="Destination book"
                      className="w-full"
                    >
                      {books.find((book) => book.id === bookId)?.title ??
                        "Select a book"}
                    </SelectTrigger>
                    <SelectContent>
                      {books.map((book) => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    A book is required.{" "}
                    <Link href="/books" className="underline">
                      Create a book
                    </Link>
                    , then return here.
                  </p>
                )}
              </div>
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
              {busy === "save"
                ? "Saving…"
                : `Save ${valid.length} card${valid.length === 1 ? "" : "s"}`}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
