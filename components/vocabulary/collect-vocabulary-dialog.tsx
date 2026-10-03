"use client";

import Link from "next/link";
import { useState } from "react";
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
  recommended?: boolean;
  source: Source;
  alreadyExists: boolean;
  existingBookTitle: string | null;
};
type Item = Candidate & {
  key: number;
  selected: boolean;
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
  language,
  disabled,
  triggerClassName = "",
}: {
  conversationId: string | null;
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

  async function discover() {
    if (mode === "topic" && !topic.trim()) {
      setMessage("Enter a topic first.");
      return;
    }
    if (mode === "conversation" && !conversationId) return;
    setBusy("discover");
    setMessage("");
    setSummary("");
    try {
      const path =
        mode === "conversation"
          ? `/api/ai/conversations/${conversationId}/vocabulary/discover`
          : "/api/ai/conversations/vocabulary/topic";
      const response = await http.post<
        ApiEnvelope<{ candidates: Candidate[] }> | { candidates: Candidate[] }
      >(
        path,
        mode === "topic"
          ? { topic: topic.trim(), targetLanguage: language }
          : {},
      );
      const candidates = unwrap(response).candidates;
      setItems(
        candidates.map((candidate, key) => ({
          ...candidate,
          key,
          selected: !candidate.alreadyExists,
        })),
      );
      if (!candidates.length)
        setMessage(
          "No useful vocabulary found. Try a topic or return to the conversation.",
        );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  function update(key: number, patch: Partial<Item>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function selectMatching(predicate: (item: Item) => boolean) {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        selected:
          item.alreadyExists ||
          item.status === "saved" ||
          item.status === "duplicate"
            ? false
            : predicate(item),
      })),
    );
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
            ({ text, type, translation, definition, example }) => ({
              text,
              type,
              translation,
              definition,
              example,
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
          void loadBooks();
        }}
      >
        Collect vocabulary
      </Button>
      <Modal open={open} onOpenChange={setOpen}>
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
                  setMode("conversation");
                  setItems([]);
                  setMessage("");
                }}
              >
                From conversation
              </Button>
              <Button
                type="button"
                variant={mode === "topic" ? "default" : "outline"}
                aria-pressed={mode === "topic"}
                onClick={() => {
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
            <Button
              type="button"
              variant="outline"
              disabled={!!busy || (mode === "conversation" && !conversationId)}
              onClick={() => void discover()}
            >
              {busy === "discover"
                ? "Analyzing…"
                : items.length
                  ? "Discover again"
                  : "Discover vocabulary"}
            </Button>
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
                    <div
                      key={item.key}
                      className="rounded-xl border border-border p-3"
                    >
                      <div className="flex items-center gap-2">
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
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
