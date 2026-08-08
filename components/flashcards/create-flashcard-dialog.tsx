"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Check,
  ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { ApiErrorResponse } from "@/lib/auth-types";
import type { Book } from "@/lib/dashboard-data";

type WordSuggestion = {
  word?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  definitions?: { text?: string; partOfSpeech?: string }[];
  translation?: string;
  examples?: { text?: string; translation?: string }[];
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

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return data?.message || "Unable to create flashcard";
  }

  return "Unable to create flashcard";
}

function getBackendBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
}

async function refreshClientToken() {
  try {
    const response = await http.post<{
      data: { accessToken: string; refreshToken: string };
    }>("/api/auth/refresh");

    window.localStorage.setItem("accessToken", response.data.accessToken);
    window.localStorage.setItem("refreshToken", response.data.refreshToken);

    return response.data.accessToken;
  } catch {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("refreshToken");
    return null;
  }
}

async function backendRequest<TData>(
  path: string,
  init: RequestInit = {},
  retryOnUnauthorized = true
) {
  const token = window.localStorage.getItem("accessToken");
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(new URL(path, getBackendBaseUrl()), {
    ...init,
    headers,
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const nextToken = await refreshClientToken();

    if (nextToken) {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Authorization", `Bearer ${nextToken}`);
      return backendRequest<TData>(
        path,
        { ...init, headers: retryHeaders },
        false
      );
    }
  }

  const contentType = response.headers.get("content-type");
  const data = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new HttpError(response, data);
  }

  return data as TData;
}

export function CreateFlashcardDialog({
  books,
  defaultBookId,
}: {
  books: Book[];
  defaultBookId?: string;
}) {
  const router = useRouter();
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
  }

  useEffect(() => {
    const query = word.trim();

    if (query.length < 2) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsAutocompleting(true);

      try {
        const url = new URL("/api/v1/words/autocomplete", getBackendBaseUrl());
        url.searchParams.set("q", query);
        url.searchParams.set("limit", "5");
        const response = await backendRequest<AutocompleteResponse>(
          `${url.pathname}${url.search}`
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

  async function handleSuggest() {
    if (!word.trim()) {
      toast.error("Enter a word first");
      return;
    }

    setIsSuggesting(true);

    try {
      const url = new URL("/api/v1/words/suggest", getBackendBaseUrl());
      url.searchParams.set("word", word.trim());
      url.searchParams.set("targetLanguage", "vi");
      url.searchParams.set("imageLimit", "6");
      const response = await backendRequest<{ data: WordSuggestion }>(
        `${url.pathname}${url.search}`
      );
      const nextSuggestion = response.data;
      const firstDefinition = nextSuggestion.definitions?.find((item) => item.text);
      const firstExample = nextSuggestion.examples?.find((item) => item.text);
      const firstImage = nextSuggestion.images?.find((item) => item.url);

      setSuggestion(nextSuggestion);
      setWord(nextSuggestion.word || word);
      setPartOfSpeech(
        nextSuggestion.partOfSpeech || firstDefinition?.partOfSpeech || ""
      );
      setPronunciation(nextSuggestion.pronunciation || "");
      setTranslation(nextSuggestion.translation || "");
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

  async function handleCorrectExample() {
    if (!example.trim()) {
      toast.error("Enter an example first");
      return;
    }

    setIsCorrectingExample(true);

    try {
      const response = await backendRequest<CorrectionResponse>(
        "/api/v1/words/correct",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: example,
            language: "en-US",
          }),
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
      });

      toast.success("Flashcard created");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-10 rounded-2xl" type="button" disabled={!books.length}>
            <Plus className="size-4" />
            Create flashcard
          </Button>
        }
      />
      <DialogContent className="grid h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden overscroll-contain sm:max-w-5xl">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute right-12 top-2"
          disabled={isSubmitting || isSuggesting}
          onClick={clearForm}
        >
          <RotateCcw className="size-4" />
          Clear
        </Button>
        <DialogHeader>
          <DialogTitle>Create flashcard</DialogTitle>
          <DialogDescription>Add a new card to a book.</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <form
            id="create-flashcard-form"
            className="min-h-0 overflow-y-auto overscroll-contain pb-16 pr-1"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4 pb-1">
            <div className="grid gap-2">
              <Label>Book</Label>
              <Select value={bookId} onValueChange={(value) => value && setBookId(value)}>
                <SelectTrigger className="h-10 w-full">
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
                      onChange={(event) => {
                        const value = event.target.value;
                        setWord(value);

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
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      Suggest
                    </Button>
                  </div>
                  {wordOptions.length || isAutocompleting ? (
                    <div className="absolute left-0 right-[108px] top-11 z-20 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
                      {isAutocompleting ? (
                        <div className="flex h-9 items-center gap-2 px-3 text-sm text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
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
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="size-3.5" />
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
                            <Check className="size-3.5" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-20 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                  <ImageIcon className="mr-2 size-4" />
                  Use Suggest to choose a picture
                </div>
              )}
            </div>

            </div>
          </form>

          <aside className="min-h-0 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-muted/30 p-3 pb-16">
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

                {suggestion.definitions?.length ? (
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

                {suggestion.examples?.length ? (
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
                  <Sparkles className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No suggestions yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter a word and click Suggest.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>

        <div className="absolute bottom-4 right-4 z-10">
          <Button
            form="create-flashcard-form"
            type="submit"
            className="h-12 rounded-2xl px-5 text-base shadow-lg shadow-brand-800/15"
            disabled={isSubmitting || !bookId}
          >
            {isSubmitting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Plus className="size-5" />
            )}
            Save flashcard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
