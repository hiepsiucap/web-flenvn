"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import {
  ArrowClockwise as RotateCcw,
  Check,
  Image as ImageIcon,
  Plus,
  Sparkle as Sparkles,
  Spinner as Loader2,
  MagicWand as Wand2,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { HttpError, http } from "@/lib/http";
import { notifyClientDataChanged } from "@/lib/client-api";
import type { ApiErrorResponse } from "@/lib/auth-types";
import type { Book } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type SuggestedDefinition = {
  text?: string;
  partOfSpeech?: string;
};

type SuggestedExample = {
  text?: string;
  translation?: string;
};

type FlashcardSuggestion = {
  definition?: SuggestedDefinition;
  translation?: string;
  example?: SuggestedExample;
};

type WordSuggestion = {
  word?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  definitions?: SuggestedDefinition[];
  translation?: string;
  examples?: SuggestedExample[];
  suggestions?: FlashcardSuggestion[];
  audio?: { url?: string };
  images?: { url?: string; source?: string; photographer?: string }[];
};

type CorrectionResponse = {
  correctedText?: string;
  correction?: string;
  text?: string;
  data?: {
    correctedText?: string;
    correction?: string;
    text?: string;
  };
};

type AutocompleteResponse =
  | string[]
  | {
      data?: {
        suggestions?: { word?: string; score?: number }[];
      };
    };

function formatApiMessage(message: ApiErrorResponse["message"] | undefined) {
  if (Array.isArray(message)) return message.filter(Boolean).join(" ");
  return message?.trim() || "Unable to create flashcard";
}

function getErrorDetails(error: unknown) {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return {
      message: formatApiMessage(data?.message),
      fieldErrors: data?.errors ?? {},
    };
  }

  return {
    message: "Unable to create flashcard",
    fieldErrors: {} as Record<string, string>,
  };
}

function getErrorMessage(error: unknown) {
  return getErrorDetails(error).message;
}

export function CreateFlashcardDialog({
  books,
  defaultBookId,
}: {
  books: Book[];
  defaultBookId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [bookId, setBookId] = useState(defaultBookId ?? books[0]?.id ?? "");
  const [word, setWord] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [translation, setTranslation] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<WordSuggestion | null>(null);
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isCorrectingExample, setIsCorrectingExample] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const selectedBook = books.find((book) => book.id === bookId);
  const suggestedImages =
    suggestion?.images?.filter((item) => item.url).slice(0, 6) ?? [];

  function clearForm() {
    setBookId(defaultBookId ?? books[0]?.id ?? "");
    setWord("");
    setPartOfSpeech("");
    setPronunciation("");
    setTranslation("");
    setDefinition("");
    setExample("");
    setImageUrl("");
    setAudioUrl("");
    setWordOptions([]);
    setSuggestion(null);
    setSubmitError("");
    setFieldErrors({});
  }

  useEffect(() => {
    const query = word.trim();

    if (query.length < 2) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsAutocompleting(true);

      try {
        const response = await http.get<AutocompleteResponse>(
          "/api/words/autocomplete",
          { query: { q: query, limit: 5 } }
        );
        const options = Array.isArray(response)
          ? response
          : response.data?.suggestions
              ?.map((suggestion) => suggestion.word)
              .filter((option): option is string => Boolean(option)) ?? [];

        setWordOptions(options.filter((option) => option !== word));
      } catch {
        setWordOptions([]);
      } finally {
        setIsAutocompleting(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [word]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setWordOptions([]);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  async function handleSuggest(event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault();

    if (!word.trim()) {
      toast.error("Enter a word first");
      return;
    }

    setIsSuggesting(true);

    try {
      const response = await http.get<{ data: WordSuggestion }>(
        "/api/words/suggest",
        {
          query: {
            word: word.trim(),
            targetLanguage: "vi",
            imageLimit: 6,
          },
        }
      );
      const nextSuggestion = response.data;
      const firstFlashcardSuggestion = nextSuggestion.suggestions?.find(
        (item) => item.definition?.text
      );
      const firstDefinition =
        firstFlashcardSuggestion?.definition ??
        nextSuggestion.definitions?.find((item) => item.text);
      const firstExample =
        firstFlashcardSuggestion?.example ??
        nextSuggestion.examples?.find((item) => item.text);
      const firstImage = nextSuggestion.images?.find((item) => item.url);

      setSuggestion(nextSuggestion);
      setWord(nextSuggestion.word || word);
      setPartOfSpeech(
        nextSuggestion.partOfSpeech || firstDefinition?.partOfSpeech || ""
      );
      setPronunciation(nextSuggestion.pronunciation || "");
      setTranslation(
        firstFlashcardSuggestion?.translation || nextSuggestion.translation || ""
      );
      setDefinition(firstDefinition?.text || "");
      setExample(firstExample?.text || "");
      setImageUrl(firstImage?.url || "");
      setAudioUrl(nextSuggestion.audio?.url || "");
      toast.success("Suggestions ready");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleCorrectExample(event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault();

    if (!example.trim()) {
      toast.error("Enter an example first");
      return;
    }

    setIsCorrectingExample(true);

    try {
      const response = await http.post<CorrectionResponse>(
        "/api/words/correct",
        {
          text: example,
          language: "en-US",
        }
      );
      const correctedText =
        response.data?.correctedText ??
        response.data?.correction ??
        response.data?.text ??
        response.correctedText ??
        response.correction ??
        response.text;

      if (correctedText) {
        setExample(correctedText);
        toast.success("Example corrected");
      } else {
        toast.info("No correction needed");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCorrectingExample(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors: Record<string, string> = {};
    if (!bookId) validationErrors.bookId = "Choose a book.";
    if (!word.trim()) validationErrors.word = "Enter a word.";

    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setSubmitError("Check the highlighted fields and try again.");
      return;
    }

    setSubmitError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await http.post("/api/flashcards", {
        word,
        partOfSpeech,
        pronunciation,
        definition,
        translation,
        audioUrl,
        imageUrl,
        example,
        bookId,
        autoLabel: true,
      });

      toast.success("Flashcard created");
      clearForm();
      setOpen(false);
      notifyClientDataChanged();
    } catch (error) {
      const details = getErrorDetails(error);
      setSubmitError(details.message);
      setFieldErrors(details.fieldErrors);
      toast.error(details.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger
        render={
          <Button className="h-10 rounded-2xl" type="button" disabled={!books.length}>
            <Icon icon={Plus} />
            Create flashcard
          </Button>
        }
      />
      <ModalContent className="h-[calc(100dvh-2rem)] sm:max-w-5xl">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute right-12 top-2"
          disabled={isSubmitting || isSuggesting}
          onClick={clearForm}
        >
          <Icon icon={RotateCcw} />
          Clear
        </Button>
        <ModalHeader>
          <ModalTitle>Create flashcard</ModalTitle>
          <ModalDescription>Add a new card to a book.</ModalDescription>
        </ModalHeader>

        <ModalBody className="lg:overflow-hidden">
          <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <Form
            id="create-flashcard-form"
            className="min-h-0 content-start pt-1 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4 pb-1">
            {submitError ? (
              <Alert variant="destructive">
                <WarningCircle />
                <AlertTitle>Couldn’t create flashcard</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-2">
              <Label>Book</Label>
              <Select value={bookId} onValueChange={(value) => {
                if (!value) return;
                setBookId(value);
                setFieldErrors((current) => ({ ...current, bookId: "" }));
              }}>
                <SelectTrigger className="h-10 w-full" aria-invalid={Boolean(fieldErrors.bookId)} aria-describedby={fieldErrors.bookId ? "flashcard-book-error" : undefined}>
                  <span className="truncate text-left">
                    {selectedBook?.title ?? "Choose a book"}
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
              {fieldErrors.bookId ? <p id="flashcard-book-error" className="text-sm font-medium text-destructive" role="alert">{fieldErrors.bookId}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="flashcard-word">Word</Label>
                <div className="relative" ref={autocompleteRef}>
                  <div className="flex gap-2">
                    <Input
                      id="flashcard-word"
                      required
                      className="h-10"
                      value={word}
                      aria-invalid={Boolean(fieldErrors.word)}
                      aria-describedby={fieldErrors.word ? "flashcard-word-error" : undefined}
                      onChange={(event) => {
                        const value = event.target.value;
                        setWord(value);
                        if (fieldErrors.word) {
                          setFieldErrors((current) => ({ ...current, word: "" }));
                        }

                        if (value.trim().length < 2) {
                          setWordOptions([]);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      disabled={isSuggesting || !word.trim()}
                      onClick={handleSuggest}
                    >
                      {isSuggesting ? (
                        <Icon icon={Loader2} className="animate-spin" />
                      ) : (
                        <Icon icon={Sparkles} />
                      )}
                      Suggest
                    </Button>
                  </div>
                  {wordOptions.length || isAutocompleting ? (
                    <div className="absolute left-0 right-[108px] top-11 z-20 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
                      {isAutocompleting ? (
                        <div className="flex h-9 items-center gap-2 px-3 text-sm text-muted-foreground">
                          <Icon icon={Loader2} size="sm" className="animate-spin" />
                          Searching
                        </div>
                      ) : null}
                      {wordOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                          onClick={() => {
                            setWord(option);
                            setWordOptions([]);
                          }}
                          onMouseDown={(event) => event.preventDefault()}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {fieldErrors.word ? <p id="flashcard-word-error" className="text-sm font-medium text-destructive" role="alert">{fieldErrors.word}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="flashcard-part">Part of speech</Label>
                <Input
                  id="flashcard-part"
                  className="h-10"
                  value={partOfSpeech}
                  onChange={(event) => setPartOfSpeech(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="flashcard-pronunciation">Pronunciation</Label>
                <Input
                  id="flashcard-pronunciation"
                  className="h-10"
                  value={pronunciation}
                  onChange={(event) => setPronunciation(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="flashcard-translation">Translation</Label>
                <Input
                  id="flashcard-translation"
                  className="h-10"
                  value={translation}
                  onChange={(event) => setTranslation(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="flashcard-definition">Definition</Label>
              <Textarea
                id="flashcard-definition"
                value={definition}
                onChange={(event) => setDefinition(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="flashcard-example">Example</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-xl"
                  disabled={isCorrectingExample || !example.trim()}
                  onClick={handleCorrectExample}
                >
                  {isCorrectingExample ? (
                    <Icon icon={Loader2} size="sm" className="animate-spin" />
                  ) : (
                    <Icon icon={Wand2} size="sm" />
                  )}
                  Correct
                </Button>
              </div>
              <Textarea
                id="flashcard-example"
                value={example}
                onChange={(event) => setExample(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="flashcard-image">Image</Label>
              {suggestedImages.length ? (
                <div className="grid grid-cols-4 gap-2">
                  {suggestedImages.map((item, index) => {
                    const isSelected = imageUrl === item.url;

                    return (
                      <button
                        key={`${item.url}-${index}`}
                        type="button"
                        className={[
                          "group relative overflow-hidden rounded-xl border bg-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-md hover:shadow-brand-800/10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]",
                          isSelected
                            ? "border-primary ring-3 ring-primary/25 shadow-lg shadow-brand-800/15"
                            : "border-border hover:border-primary/60",
                        ].join(" ")}
                        onClick={() => setImageUrl(item.url ?? "")}
                        aria-label={`Choose suggested image ${index + 1}`}
                      >
                        <span
                          className="block aspect-square bg-secondary bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                          style={{ backgroundImage: `url(${item.url})` }}
                        />
                        <span
                          className={[
                            "absolute inset-0 bg-primary/0 transition-colors duration-200",
                            isSelected ? "bg-primary/15" : "group-hover:bg-primary/10",
                          ].join(" ")}
                        />
                        {isSelected ? (
                          <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-md animate-in zoom-in-75">
                            <Icon icon={Check} size="sm" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-20 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  <Icon icon={ImageIcon} className="mr-2" />
                  Use Suggest to choose a picture
                </div>
              )}
            </div>

            </div>
          </Form>

          <aside className="min-h-0 rounded-2xl border border-border bg-muted/30 p-3 lg:h-full lg:overflow-y-auto lg:overscroll-contain">
            {suggestion ? (
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Suggestions</p>
                    <p className="text-xs text-muted-foreground">
                      Pick options for this flashcard.
                    </p>
                  </div>
                  {suggestion.audio?.url ? (
                    <audio controls className="h-8 max-w-40">
                      <source src={suggestion.audio.url} />
                    </audio>
                  ) : null}
                </div>

                {suggestion.suggestions?.length ? (
                  <div className="grid gap-2">
                    <Label>Flashcard options</Label>
                    {suggestion.suggestions
                      .filter((item) => item.definition?.text)
                      .map((item, index) => (
                        <button
                          key={`${item.definition?.text}-${index}`}
                          type="button"
                          aria-pressed={
                            definition === item.definition?.text &&
                            example === (item.example?.text ?? "")
                          }
                          className={cn(
                            "rounded-xl border bg-card p-3 text-left text-sm transition-colors hover:border-primary/60 hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                            definition === item.definition?.text &&
                              example === (item.example?.text ?? "")
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border"
                          )}
                          onClick={() => {
                            setDefinition(item.definition?.text ?? "");
                            setTranslation(
                              item.translation ?? suggestion.translation ?? ""
                            );
                            setExample(item.example?.text ?? "");
                            if (item.definition?.partOfSpeech) {
                              setPartOfSpeech(item.definition.partOfSpeech);
                            }
                          }}
                        >
                          <span className="block leading-relaxed">
                            {item.definition?.text}
                          </span>
                          {item.definition?.partOfSpeech ? (
                            <Badge variant="secondary" className="mt-2 capitalize">
                              {item.definition.partOfSpeech}
                            </Badge>
                          ) : null}
                          {item.translation ? (
                            <span className="mt-2 block font-medium text-primary">
                              {item.translation}
                            </span>
                          ) : null}
                          {item.example?.text ? (
                            <span className="mt-2 block border-t border-border pt-2 text-muted-foreground">
                              {item.example.text}
                              {item.example.translation ? (
                                <span className="mt-1 block text-xs">
                                  {item.example.translation}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="mt-2 block text-xs text-muted-foreground">
                              No example available
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                ) : suggestion.definitions?.length ? (
                  <div className="grid gap-2">
                    <Label>Definitions</Label>
                    {suggestion.definitions
                      .filter((item) => item.text)
                      .map((item, index) => (
                        <button
                          key={`${item.text}-${index}`}
                          type="button"
                          className="rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary/60 hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          onClick={() => {
                            setDefinition(item.text ?? "");
                            if (item.partOfSpeech) setPartOfSpeech(item.partOfSpeech);
                          }}
                        >
                          {item.text}
                          {item.partOfSpeech ? (
                            <Badge variant="secondary" className="ml-2 capitalize">
                              {item.partOfSpeech}
                            </Badge>
                          ) : null}
                        </button>
                      ))}
                  </div>
                ) : null}

                {!suggestion.suggestions?.length && suggestion.examples?.length ? (
                  <div className="grid gap-2">
                    <Label>Examples</Label>
                    {suggestion.examples
                      .filter((item) => item.text)
                      .map((item, index) => (
                        <button
                          key={`${item.text}-${index}`}
                          type="button"
                          className="rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary/60 hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          onClick={() => setExample(item.text ?? "")}
                        >
                          {item.text}
                          {item.translation ? (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {item.translation}
                            </span>
                          ) : null}
                        </button>
                      ))}
                  </div>
                ) : null}

                {suggestedImages.length ? (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Pictures are available in the form image chooser.
                    </p>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="grid h-full min-h-[180px] place-items-center text-center">
                <div>
                  <Icon icon={Sparkles} className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No suggestions yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter a word and click Suggest.
                  </p>
                </div>
              </div>
            )}
          </aside>
          </div>
        </ModalBody>

        <ModalFooter className="shrink-0 pt-4">
          <ModalActionButton
            form="create-flashcard-form"
            className="h-12 rounded-2xl px-5 text-base shadow-lg shadow-brand-800/15"
            disabled={isSubmitting || !bookId}
          >
            {isSubmitting ? (
              <Icon icon={Loader2} size="lg" className="animate-spin" />
            ) : (
              <Icon icon={Plus} size="lg" />
            )}
            Save flashcard
          </ModalActionButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
