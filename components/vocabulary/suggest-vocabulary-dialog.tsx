"use client";

import { FormEvent, useState } from "react";
import {
  ArrowClockwise as RotateCcw,
  Check,
  Plus,
  Sparkle as Sparkles,
  Spinner as Loader2,
  X,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import {
  Modal,
  ModalActionButton,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HttpError, http } from "@/lib/http";
import type { ApiErrorResponse, ApiEnvelope } from "@/lib/auth-types";
import type { Book } from "@/lib/dashboard-data";

type TopicLevel = "beginner" | "intermediate" | "advanced";

type TopicVocabularySuggestion = {
  id?: string;
  word: string;
  normalizedWord?: string;
  audioUrl?: string;
  imageUrl?: string;
  exampleAudioUrl?: string;
  partOfSpeech?: string;
  definition?: string;
  translation?: string;
  example?: string;
  exampleTranslation?: string;
  difficulty?: TopicLevel;
  alreadyExists?: boolean;
  duplicateOfFlashcardId?: string;
  confidence?: number;
};

type SelectableSuggestion = TopicVocabularySuggestion & {
  localId: string;
  selected: boolean;
  status?: "created" | "failed" | "duplicate";
};

type SuggestTopicResponse = {
  topic: string;
  level?: TopicLevel;
  targetLanguage: string;
  suggestions: TopicVocabularySuggestion[];
};

type WordSuggestion = {
  word?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  definitions?: { text?: string; partOfSpeech?: string }[];
  translation?: string;
  examples?: { text?: string; translation?: string; audioUrl?: string }[];
  audio?: { url?: string };
  images?: { url?: string }[];
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    const message = data?.message;
    return Array.isArray(message) ? message.join(", ") : message || fallback;
  }

  return fallback;
}

function unwrapData<TData>(response: ApiEnvelope<TData> | TData) {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    "success" in response
  ) {
    return (response as ApiEnvelope<TData>).data;
  }

  return response as TData;
}

export function SuggestVocabularyDialog({ books }: { books: Book[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<TopicLevel>("beginner");
  const [limit, setLimit] = useState("20");
  const [targetLanguage, setTargetLanguage] = useState("vi");
  const [bookId, setBookId] = useState(books[0]?.id ?? "");
  const [items, setItems] = useState<SelectableSuggestion[]>([]);
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [enrichingId, setEnrichingId] = useState("");
  const [createdCount, setCreatedCount] = useState(0);
  const selectedCount = items.filter((item) => item.selected && !item.alreadyExists).length;
  const allSelected =
    items.length > 0 &&
    items.every((item) => item.selected || item.alreadyExists);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!topic.trim()) {
      setMessage("Enter a topic first.");
      toast.error("Enter a topic first");
      return;
    }

    setIsGenerating(true);
    setMessage("");
    setCreatedCount(0);

    try {
      const response = await http.post<
        ApiEnvelope<SuggestTopicResponse> | SuggestTopicResponse
      >("/api/words/suggest-topic", {
        topic: topic.trim(),
        level,
        limit: Number(limit),
        targetLanguage,
      });
      const data = unwrapData(response);
      const suggestions = data?.suggestions ?? [];

      setItems(
        suggestions.map((suggestion, index) => ({
          ...suggestion,
          localId: suggestion.id ?? `${suggestion.word}-${index}`,
          selected: !suggestion.alreadyExists,
        }))
      );

      if (!suggestions.length) {
        setMessage("No vocabulary found for this topic.");
        toast.info("No vocabulary found for this topic");
      }
    } catch (error) {
      const nextMessage = getErrorMessage(error, "Unable to suggest vocabulary");
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCreateFlashcards() {
    const selectedItems = items.filter((item) => item.selected && !item.alreadyExists);

    if (!selectedItems.length) {
      toast.error("Choose at least one word");
      return;
    }

    setIsCreating(true);
    setCreatedCount(0);

    let created = 0;
    let failed = 0;

    for (const item of selectedItems) {
      try {
        await http.post("/api/flashcards", {
          word: item.word,
          partOfSpeech: item.partOfSpeech,
          definition: item.definition,
          translation: item.translation,
          example: item.example,
          exampleTranslation: item.exampleTranslation,
          audioUrl: item.audioUrl,
          imageUrl: item.imageUrl,
          exampleAudioUrl: item.exampleAudioUrl,
          bookId: bookId || undefined,
        });
        created += 1;
        setCreatedCount(created);
        updateItemStatus(item.localId, "created");
      } catch (error) {
        failed += 1;
        updateItemStatus(
          item.localId,
          getErrorMessage(error, "").toLowerCase().includes("exist")
            ? "duplicate"
            : "failed"
        );
      }
    }

    if (created) {
      router.refresh();
    }

    toast.success(
      failed ? `${created} created, ${failed} failed` : `${created} flashcards created`
    );
    setIsCreating(false);
  }

  function updateItemStatus(
    localId: string,
    status: SelectableSuggestion["status"]
  ) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, selected: false, status } : item
      )
    );
  }

  function toggleAll(checked: boolean) {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        selected: item.alreadyExists ? false : checked,
      }))
    );
  }

  function updateItem(localId: string, updates: Partial<SelectableSuggestion>) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, ...updates } : item
      )
    );
  }

  function clearSuggestions() {
    setItems([]);
    setMessage("");
    setCreatedCount(0);
  }

  async function handleEnrichSuggestion(item: SelectableSuggestion) {
    if (!item.word.trim()) {
      toast.error("Enter a word first");
      return;
    }

    setEnrichingId(item.localId);

    try {
      const response = await http.get<ApiEnvelope<WordSuggestion> | WordSuggestion>(
        "/api/words/suggest",
        {
          query: {
            word: item.word.trim(),
            targetLanguage,
            imageLimit: 4,
          },
        }
      );
      const suggestion = unwrapData(response);
      const firstDefinition = suggestion?.definitions?.find((definition) => definition.text);
      const firstExample = suggestion?.examples?.find((example) => example.text);
      const firstImage = suggestion?.images?.find((image) => image.url);

      updateItem(item.localId, {
        word: suggestion?.word || item.word,
        partOfSpeech:
          suggestion?.partOfSpeech ||
          firstDefinition?.partOfSpeech ||
          item.partOfSpeech,
        definition: firstDefinition?.text || item.definition,
        translation: suggestion?.translation || item.translation,
        example: firstExample?.text || item.example,
        exampleTranslation: firstExample?.translation || item.exampleTranslation,
        audioUrl: suggestion?.audio?.url || item.audioUrl,
        imageUrl: firstImage?.url || item.imageUrl,
        exampleAudioUrl: firstExample?.audioUrl || item.exampleAudioUrl,
      });
      toast.success("Suggestion updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to suggest details"));
    } finally {
      setEnrichingId("");
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger
        render={
          <Button
            type="button"
            size="icon-lg"
            className="fixed bottom-5 right-5 z-40 size-14 rounded-full shadow-lg shadow-brand-800/20"
          >
            <Icon icon={Sparkles} size="lg" />
            <span className="sr-only">Suggest vocabulary</span>
          </Button>
        }
      />
      <ModalContent className="sm:max-w-5xl">
        <ModalHeader>
          <ModalTitle>Suggest vocabulary</ModalTitle>
          <ModalDescription>
            Generate topic words, choose what you want, then create flashcards.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="py-1">
          <Form
            id="suggest-vocabulary-form"
            className="gap-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={handleGenerate}
          >
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="topic-vocabulary-topic">Topic</Label>
              <Input
                id="topic-vocabulary-topic"
                className="h-10"
                maxLength={100}
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setMessage("");
                }}
                placeholder="restaurant English"
              />
            </div>
            <SelectControl
              label="Level"
              value={level}
              onValueChange={(value) => value && setLevel(value as TopicLevel)}
              options={[
                ["beginner", "Beginner"],
                ["intermediate", "Intermediate"],
                ["advanced", "Advanced"],
              ]}
            />
            <SelectControl
              label="Count"
              value={limit}
              onValueChange={(value) => value && setLimit(value)}
              options={[
                ["10", "10"],
                ["20", "20"],
                ["30", "30"],
              ]}
            />
            <div className="grid gap-2">
              <Label htmlFor="topic-vocabulary-language">Language</Label>
              <Input
                id="topic-vocabulary-language"
                className="h-10"
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-1 lg:col-span-3">
              <Label>Destination book</Label>
              <Select value={bookId} onValueChange={(value) => setBookId(value ?? "")}>
                <SelectTrigger className="h-10 w-full">
                  <span className="truncate text-left">
                    {books.find((book) => book.id === bookId)?.title ?? "No book selected"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Form>
          {message ? (
            <p className="mt-3 text-sm text-destructive">{message}</p>
          ) : null}

          <div className="mt-5 grid gap-3">
            {items.length ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                  />
                  Select all
                </label>
              </div>
            ) : null}

            {items.map((item) => (
              <div key={item.localId} className="grid gap-3 rounded-2xl border border-border p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={item.selected}
                    disabled={item.alreadyExists || item.status === "created"}
                    onCheckedChange={(checked) =>
                      updateItem(item.localId, { selected: Boolean(checked) })
                    }
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.imageUrl ? (
                        <div
                          className="h-16 w-16 shrink-0 rounded-xl bg-secondary bg-cover bg-center"
                          style={{ backgroundImage: `url(${item.imageUrl})` }}
                        />
                      ) : null}
                      <Input
                        className="h-9 max-w-64 text-base font-semibold"
                        value={item.word}
                        onChange={(event) =>
                          updateItem(item.localId, { word: event.target.value })
                        }
                      />
                      {item.partOfSpeech ? (
                        <Badge variant="outline" className="rounded-2xl">
                          {item.partOfSpeech}
                        </Badge>
                      ) : null}
                      <SuggestionStatus item={item} />
                      {item.audioUrl ? (
                        <Badge variant="outline" className="rounded-2xl">
                          Audio
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Textarea
                        value={item.definition ?? ""}
                        placeholder="Definition"
                        onChange={(event) =>
                          updateItem(item.localId, { definition: event.target.value })
                        }
                      />
                      <Textarea
                        value={item.example ?? ""}
                        placeholder="Example"
                        onChange={(event) =>
                          updateItem(item.localId, { example: event.target.value })
                        }
                      />
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        className="h-9"
                        value={item.translation ?? ""}
                        placeholder="Translation"
                        onChange={(event) =>
                          updateItem(item.localId, { translation: event.target.value })
                        }
                      />
                      <Input
                        className="h-9"
                        value={item.exampleTranslation ?? ""}
                        placeholder="Example translation"
                        onChange={(event) =>
                          updateItem(item.localId, {
                            exampleTranslation: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-2xl"
                    disabled={enrichingId === item.localId}
                    onClick={() => handleEnrichSuggestion(item)}
                  >
                    {enrichingId === item.localId ? (
                      <Icon icon={Loader2} size="sm" className="animate-spin" />
                    ) : (
                      <Icon icon={Sparkles} size="sm" />
                    )}
                    Suggest
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((candidate) => candidate.localId !== item.localId)
                      )
                    }
                  >
                    <Icon icon={X} />
                    <span className="sr-only">Remove suggestion</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalActionButton
            form="suggest-vocabulary-form"
            variant={items.length ? "outline" : "default"}
            disabled={isGenerating || isCreating}
          >
            {isGenerating ? (
              <Icon icon={Loader2} className="animate-spin" />
            ) : (
              <Icon icon={Sparkles} />
            )}
            Generate
          </ModalActionButton>
          {items.length ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-2xl"
                disabled={isCreating}
                onClick={clearSuggestions}
              >
                <Icon icon={RotateCcw} />
                Clear
              </Button>
              <ModalActionButton
                type="button"
                className="h-10 rounded-2xl"
                disabled={isCreating || selectedCount === 0}
                onClick={handleCreateFlashcards}
              >
                {isCreating ? (
                  <Icon icon={Loader2} className="animate-spin" />
                ) : (
                  <Icon icon={Plus} />
                )}
                {isCreating
                  ? `Creating ${createdCount} of ${selectedCount}`
                  : `Create ${selectedCount}`}
              </ModalActionButton>
            </>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function SelectControl({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onValueChange: (value: string | null) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 w-full">
          <span>{options.find(([option]) => option === value)?.[1] ?? value}</span>
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SuggestionStatus({ item }: { item: SelectableSuggestion }) {
  if (item.alreadyExists || item.status === "duplicate") {
    return <Badge variant="outline">Already added</Badge>;
  }

  if (item.status === "created") {
    return (
      <Badge variant="secondary">
        <Icon icon={Check} size="sm" />
        Created
      </Badge>
    );
  }

  if (item.status === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }

  return null;
}
