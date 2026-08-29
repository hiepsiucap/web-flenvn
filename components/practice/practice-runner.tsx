"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import {
  Check,
  Clock as Clock3,
  CaretLeft,
  CaretRight,
  Headphones,
  Image as ImageIcon,
  Stack as Layers3,
  Spinner as Loader2,
  Play,
  Sparkle as Sparkles,
  Student,
  Target,
  Trophy,
  X,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { HttpError, http } from "@/lib/http";
import type { ApiErrorResponse, ApiEnvelope } from "@/lib/auth-types";
import type { Flashcard, ReviewDueBook } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import penguinPlayGame from "@/img/penguin-playgame.png";
import {
  blankWord,
  calculateQuality,
  createPracticeGames,
  isCorrectAnswer,
  type PracticeFlashcardResult,
  type PracticeGame,
  type PracticeGameResult,
} from "@/lib/practice-games";

type PracticeStep = {
  card: Flashcard;
  game: PracticeGame;
};

type PracticeSummary = {
  totalGames: number;
  correctGames: number;
  skippedGames: number;
  score: number;
  accuracy: number;
};

const GAME_TIME_LIMIT_MS = 10000;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    const message = data?.message;
    return Array.isArray(message) ? message.join(", ") : message || fallback;
  }

  return fallback;
}

function getCardList(data: ApiEnvelope<Flashcard[]> | Flashcard[]) {
  return Array.isArray(data) ? data : data.data;
}

function getNow() {
  return performance.now();
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function PracticeRunner({
  books,
  flashcardPool,
}: {
  books: ReviewDueBook[];
  flashcardPool: Flashcard[];
}) {
  const router = useRouter();
  const firstBook = books.find((book) => book.dueForReview > 0) ?? books[0];
  const [bookId, setBookId] = useState(getReviewBookId(firstBook) ?? "");
  const selectedBook = books.find((book) => getReviewBookId(book) === bookId);
  const [limit, setLimit] = useState(Math.min(selectedBook?.dueForReview ?? 0, 6) || 1);
  const [message, setMessage] = useState("");
  const [steps, setSteps] = useState<PracticeStep[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(GAME_TIME_LIMIT_MS);
  const [results, setResults] = useState<Record<string, PracticeGameResult[]>>({});
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewSteps, setReviewSteps] = useState<PracticeStep[]>([]);
  const [isReviewFlipped, setIsReviewFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitAnswerRef = useRef<(value: string, skipped?: boolean) => void>(() => {});
  const current = steps[index];
  const progress = steps.length ? Math.round((index / steps.length) * 100) : 0;
  const completedGames = Object.values(results).flat();
  const totalCorrect = completedGames.filter((item) => item.result === "correct").length;
  const liveScore = completedGames.reduce((total, item) => total + item.score, 0);
  const totalDue = books.reduce((total, book) => total + book.dueForReview, 0);
  const totalCards = books.reduce((total, book) => total + book.totalCards, 0);
  const countOptions = getPracticeCountOptions(selectedBook?.dueForReview ?? 0);
  const maxScore = Math.min(limit, selectedBook?.dueForReview ?? 0) * 40;

  useEffect(() => {
    if (!current || isSubmitting || startedAt <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      const nextTimeLeft = Math.max(
        0,
        GAME_TIME_LIMIT_MS - Math.round(getNow() - startedAt)
      );

      setTimeLeftMs(nextTimeLeft);

      if (nextTimeLeft <= 0) {
        window.clearInterval(interval);
        submitAnswerRef.current("", true);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [current, isSubmitting, startedAt]);

  const prompt = useMemo(() => {
    if (!current) return null;

    if (current.game.promptType === "example-blank") {
      return blankWord(current.card.example ?? "", current.card.word);
    }

    return null;
  }, [current]);

  async function startPractice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBook || selectedBook.dueForReview <= 0) {
      setMessage("Choose a book with due cards.");
      toast.error("Choose a book with due cards");
      return;
    }

    setMessage("");
    setIsLoading(true);

    try {
      const response = await http.get<ApiEnvelope<Flashcard[]> | Flashcard[]>(
        "/api/flashcards/review/due",
        {
          query: {
            bookId,
            limit: Math.min(limit, selectedBook.dueForReview),
          },
        }
      );
      const dueCards = getCardList(response) ?? [];
      const pool = mergeCards(dueCards, flashcardPool);
      const nextSteps = dueCards.flatMap((card) =>
        createPracticeGames(card, pool).map((game) => ({ card, game }))
      );

      if (!dueCards.length) {
        setMessage("No due flashcards were returned for this book.");
        toast.error("No due flashcards were returned");
        return;
      }

      if (!nextSteps.length) {
        setMessage("These due cards do not have enough translation, example, image, or audio data yet.");
        toast.error("No playable games found for these cards");
        return;
      }

      preloadMedia(dueCards);
      setReviewCards(dueCards);
      setReviewSteps(nextSteps);
      setReviewIndex(0);
      setIsReviewFlipped(false);
      setSteps([]);
      setIndex(0);
      setAnswer("");
      setResults({});
      setSummary(null);
      setStartedAt(0);
      setRunStartedAt(0);
      setTimeLeftMs(GAME_TIME_LIMIT_MS);
    } catch (error) {
      const nextMessage = getErrorMessage(error, "Unable to start practice");
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setIsLoading(false);
    }
  }

  const startGameFromReview = useCallback(function startGameFromReview() {
    if (!reviewSteps.length) return;

    setSteps(reviewSteps);
    setReviewCards([]);
    setReviewSteps([]);
    setReviewIndex(0);
    setIsReviewFlipped(false);
    setIndex(0);
    setAnswer("");
    setResults({});
    setSummary(null);
    setStartedAt(getNow());
    setRunStartedAt(getNow());
    setTimeLeftMs(GAME_TIME_LIMIT_MS);
  }, [reviewSteps]);

  const closeReviewPhase = useCallback(function closeReviewPhase() {
    setReviewCards([]);
    setReviewSteps([]);
    setReviewIndex(0);
    setIsReviewFlipped(false);
  }, []);

  const goToPreviousReviewCard = useCallback(function goToPreviousReviewCard() {
    setReviewIndex((value) => Math.max(0, value - 1));
    setIsReviewFlipped(false);
  }, []);

  const goToNextReviewCard = useCallback(function goToNextReviewCard() {
    if (reviewIndex + 1 >= reviewCards.length) {
      startGameFromReview();
      return;
    }

    setReviewIndex((value) => Math.min(reviewCards.length - 1, value + 1));
    setIsReviewFlipped(false);
  }, [reviewCards.length, reviewIndex, startGameFromReview]);

  async function finishPractice(nextResults: Record<string, PracticeGameResult[]>) {
    if (!selectedBook) return;

    setIsSubmitting(true);

    const flashcards: PracticeFlashcardResult[] = Object.entries(nextResults).map(
      ([flashcardId, games]) => ({
        flashcardId,
        quality: calculateQuality(games),
        games,
      })
    );
    const nextSummary = summarizeResults(nextResults);

    try {
      await http.post("/api/sessions/practice", {
        bookId: selectedBook.bookId,
        durationMs: Math.round(getNow() - runStartedAt),
        flashcards,
      });
      await http.get("/api/users/profile");
      toast.success("Practice saved");
      setSteps([]);
      setIndex(0);
      setSummary(nextSummary);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Practice finished, but saving failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitAnswer(value: string, skipped = false) {
    if (!current) return;

    const correct = !skipped && isCorrectAnswer(value, current.game.answer);
    const responseTime = Math.round(getNow() - startedAt);
    const result: PracticeGameResult = {
      gameType: current.game.type,
      result: skipped ? "skipped" : correct ? "correct" : "incorrect",
      responseTime,
      score: correct ? calculateGameScore(responseTime) : 0,
    };
    const nextResults = {
      ...results,
      [current.card.id]: [...(results[current.card.id] ?? []), result],
    };

    setResults(nextResults);
    setAnswer("");

    if (index + 1 >= steps.length) {
      await finishPractice(nextResults);
      return;
    }

    setIndex(index + 1);
    setStartedAt(getNow());
    setTimeLeftMs(GAME_TIME_LIMIT_MS);
  }

  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      if (reviewCards.length) {
        if (event.key === "ArrowLeft" && reviewIndex > 0) {
          event.preventDefault();
          goToPreviousReviewCard();
          return;
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          goToNextReviewCard();
          return;
        }

        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          setIsReviewFlipped((value) => !value);
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          closeReviewPhase();
        }

        return;
      }

      if (!current || isSubmitting) return;

      if (event.key === "Escape") {
        event.preventDefault();
        submitAnswerRef.current("", true);
        return;
      }

      if (current.game.mechanism !== "quiz") return;

      const keyNumber = Number(event.key);
      const choices = current.game.choices ?? [];

      if (Number.isInteger(keyNumber) && keyNumber >= 1 && keyNumber <= choices.length) {
        event.preventDefault();
        submitAnswerRef.current(choices[keyNumber - 1]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeReviewPhase,
    current,
    goToNextReviewCard,
    goToPreviousReviewCard,
    isSubmitting,
    reviewCards.length,
    reviewIndex,
  ]);

  if (summary) {
    return (
      <div className="grid max-w-4xl gap-5">
        <section className="relative overflow-hidden rounded-3xl border border-border p-6">
          <Confetti />
          <div className="relative z-10 grid gap-5">
            <div>
              <p className="text-sm text-muted-foreground">Practice complete</p>
              <h1 className="mt-1 text-4xl font-semibold">{getFinishTitle(summary.accuracy)}</h1>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ResultMetric icon={<Icon icon={Trophy} />} label="Score" value={String(summary.score)} />
              <ResultMetric icon={<Icon icon={Sparkles} />} label="Accuracy" value={`${summary.accuracy}%`} />
              <ResultMetric icon={<Icon icon={Check} />} label="Correct" value={`${summary.correctGames}/${summary.totalGames}`} />
            </div>
            <p className="text-sm text-muted-foreground">
              {summary.skippedGames
                ? `${summary.skippedGames} skipped game${summary.skippedGames === 1 ? "" : "s"}.`
                : "No skipped games."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="h-10 rounded-2xl"
                onClick={() => setSummary(null)}
              >
                <Icon icon={Play} />
                Practice again
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (reviewCards.length) {
    const reviewCard = reviewCards[reviewIndex];
    const reviewProgress = Math.round(((reviewIndex + 1) / reviewCards.length) * 100);

    return (
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Review first</p>
            <h1 className="text-2xl font-semibold">{selectedBook?.title}</h1>
          </div>
          <Badge variant="outline" className="h-8 rounded-xl px-3 text-xs">
            {reviewIndex + 1} / {reviewCards.length}
          </Badge>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Preview progress</span>
            <span>{reviewProgress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${reviewProgress}%` }} />
          </div>
        </div>

        <div className="grid items-center gap-3 sm:grid-cols-[auto_minmax(0,30rem)_auto] sm:justify-center">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="hidden rounded-full sm:inline-flex"
            disabled={reviewIndex === 0}
            aria-label="Previous flashcard"
            onClick={goToPreviousReviewCard}
          >
            <Icon icon={CaretLeft} />
          </Button>

          <ReviewFlipCard
            card={reviewCard}
            flipped={isReviewFlipped}
            onFlip={() => setIsReviewFlipped((value) => !value)}
          />

          {reviewIndex + 1 < reviewCards.length ? (
            <Button
              type="button"
              size="icon-lg"
              className="hidden rounded-full sm:inline-flex"
              aria-label="Next flashcard"
              onClick={goToNextReviewCard}
            >
              <Icon icon={CaretRight} />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon-lg"
              className="hidden rounded-full sm:inline-flex"
              aria-label="Start game"
              onClick={startGameFromReview}
            >
              <Icon icon={Play} />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={closeReviewPhase}
          >
            <Icon icon={X} />
            Back
          </Button>

          <div className="flex items-center gap-2 sm:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={reviewIndex === 0}
              onClick={goToPreviousReviewCard}
            >
              <Icon icon={CaretLeft} />
              Previous
            </Button>
            {reviewIndex + 1 < reviewCards.length ? (
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                onClick={goToNextReviewCard}
              >
                Next
                <Icon icon={CaretRight} />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                onClick={startGameFromReview}
              >
                <Icon icon={Play} />
                Start game
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (current) {
    return (
      <div className="grid max-w-4xl gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Practice</p>
            <h1 className="text-2xl font-semibold">{selectedBook?.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-8 rounded-2xl px-3">
              <Icon icon={Trophy} className="text-primary" />
              {liveScore}
            </Badge>
            <Badge variant="outline" className="h-8 rounded-2xl px-3">
              {index + 1} / {steps.length}
            </Badge>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progress {progress}%</span>
            <span className="inline-flex items-center gap-1">
              <Icon icon={Clock3} />
              {Math.ceil(timeLeftMs / 1000)}s
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${(timeLeftMs / GAME_TIME_LIMIT_MS) * 100}%` }}
            />
          </div>
        </div>

        <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{getGameTitle(current.game)}</CardTitle>
                <CardDescription>{current.card.partOfSpeech || "Flashcard"}</CardDescription>
              </div>
              <Badge variant="secondary" className="rounded-2xl capitalize">
                {current.game.mechanism}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <PromptView card={current.card} game={current.game} prompt={prompt} />
            {current.game.mechanism === "quiz" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {current.game.choices?.map((choice, choiceIndex) => (
                  <Button
                    key={choice}
                    type="button"
                    variant="outline"
                    className="h-12 justify-start rounded-2xl px-4 text-left"
                    disabled={isSubmitting}
                    onClick={() => submitAnswer(choice)}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {choiceIndex + 1}
                    </span>
                    {choice}
                  </Button>
                ))}
              </div>
            ) : (
              <Form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitAnswer(answer);
                }}
              >
                <Input
                  className="h-12"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  autoFocus
                  placeholder="Type your answer"
                />
                <Button className="h-12 rounded-2xl" disabled={isSubmitting || !answer.trim()}>
                  <Icon icon={Check} />
                  Answer
                </Button>
              </Form>
            )}
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                disabled={isSubmitting}
                onClick={() => submitAnswer("", true)}
              >
                <Icon icon={X} />
                Skip
              </Button>
              <p className="text-sm text-muted-foreground">{totalCorrect} correct</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_210px] lg:items-end">
        <div className="grid gap-3">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-sm shadow-brand-800/5">
            <Icon icon={Layers3} className="text-primary" />
            Review mode
          </div>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Play game
            </h1>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
              <span>Words to play</span>
              <Select
                value={String(limit)}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setMessage("");
                }}
              >
                <SelectTrigger className="h-8 min-w-16 rounded-xl bg-card px-2.5 text-sm text-foreground">
                  <span>{limit}</span>
                </SelectTrigger>
                <SelectContent>
                  {countOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="hidden justify-self-end lg:block">
          <NextImage
            src={penguinPlayGame}
            alt=""
            className="h-auto w-52 object-contain"
            priority
          />
        </div>
      </section>

      <Card className="rounded-2xl shadow-md shadow-brand-800/10">
        <CardContent className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_1px_minmax(0,0.72fr)_1px_minmax(0,0.72fr)] lg:items-center">
          <div className="grid gap-1.5 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
            <Label className="text-sm font-semibold text-foreground">Play with</Label>
            <Select
              value={bookId}
              onValueChange={(value) => {
                const nextBook = books.find((book) => getReviewBookId(book) === value);

                setBookId(value ?? "");
                setLimit(Math.min(nextBook?.dueForReview ?? 1, 6) || 1);
                setMessage("");
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl bg-background px-3">
                <span className="truncate text-left text-sm font-medium">
                  {selectedBook?.title ?? "Choose a book"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {books.map((book) => (
                  <SelectItem key={getReviewBookId(book)} value={getReviewBookId(book)}>
                    {book.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden h-11 bg-border lg:block" />

          <ReviewSetupMetric
            tone="learned"
            value={String(totalCards)}
            label="Words learned"
          />

          <div className="hidden h-11 bg-border lg:block" />

          <ReviewSetupMetric
            tone="review"
            value={String(totalDue)}
            label="Words to review"
          />
        </CardContent>
      </Card>

      <section className="mx-auto grid w-full max-w-xl gap-3">
        <div className="rounded-xl bg-accent/60 px-3 py-2 text-center text-xs font-medium text-foreground">
          Includes question types: multiple choice, fill in the blank, type answer, and match words.
        </div>

        <Form className="mx-auto w-full max-w-xs" onSubmit={startPractice}>
          <Button
            type="submit"
            className="h-11 w-full rounded-xl text-sm shadow-md shadow-brand-800/20"
            disabled={isLoading || !selectedBook || selectedBook.dueForReview <= 0}
          >
            {isLoading ? (
              <Icon icon={Loader2} className="animate-spin" />
            ) : (
              <Icon icon={Play} />
            )}
            Play now
            <Icon icon={Sparkles} />
          </Button>
        </Form>

        <div className="grid gap-0.5 text-center text-xs text-muted-foreground">
          <p>
            Target: {limit} word{limit === 1 ? "" : "s"} · Possible score: {maxScore}
          </p>
          <p>Faster correct answers keep more points.</p>
        </div>

        {message ? (
          <p className="text-center text-xs text-destructive">{message}</p>
        ) : selectedBook?.dueForReview === 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            This book has no cards due right now.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ResultMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function ReviewFlipCard({
  card,
  flipped,
  onFlip,
}: {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      className="group grid min-h-[420px] w-full max-w-md justify-self-center rounded-2xl text-left outline-none [perspective:1200px] focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={onFlip}
    >
      <div
        className={cn(
          "relative size-full min-h-[420px] rounded-2xl transition-transform duration-500 [animation:flashcard-pull_2.4s_ease-in-out_infinite] [transform-style:preserve-3d] group-hover:[animation-play-state:paused]",
          flipped && "[transform:rotateY(180deg)]"
        )}
      >
        <div className="absolute inset-0 grid overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-md shadow-brand-800/10 [backface-visibility:hidden]">
          <div className="flex items-start justify-between gap-4">
            <Badge variant="secondary" className="rounded-xl text-xs">
              Front
            </Badge>
            <span className="text-xs text-muted-foreground">Tap to flip</span>
          </div>

          <div className="grid place-items-center text-center">
            <div className="grid justify-items-center gap-4">
              {card.imageUrl ? (
                <div
                  className="h-40 w-56 max-w-full rounded-2xl border border-border bg-secondary bg-cover bg-center shadow-sm shadow-brand-800/10"
                  style={{ backgroundImage: `url(${card.imageUrl})` }}
                  aria-label={`${card.word} image`}
                  role="img"
                />
              ) : null}
              <p className="text-4xl font-semibold text-primary">{card.word}</p>
              {card.pronunciation ? (
                <p className="mt-2 text-sm text-muted-foreground">{card.pronunciation}</p>
              ) : null}
              {card.partOfSpeech ? (
                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                  {card.partOfSpeech}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="absolute inset-0 grid overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-md shadow-brand-800/10 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex items-start justify-between gap-4">
            <Badge variant="outline" className="rounded-xl text-xs">
              Back
            </Badge>
            <span className="text-xs text-muted-foreground">Tap to flip back</span>
          </div>

          <div className="grid max-h-full content-center gap-4 overflow-y-auto pr-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Definition
              </p>
              <p className="mt-1 text-lg font-semibold leading-7 text-foreground">
                {card.definition || "No definition yet"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Translation
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {card.translation || "No translation yet"}
              </p>
            </div>
            {card.example ? (
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Example
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">{card.example}</p>
                {card.exampleTranslation ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {card.exampleTranslation}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function ReviewSetupMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "learned" | "review";
  value: string;
}) {
  const styles =
    tone === "learned"
      ? {
          accent: "text-sky-500",
          main: "text-primary",
          value: "text-primary",
          warm: "text-secondary",
        }
      : {
          accent: "text-emerald-500",
          main: "text-primary",
          value: "text-emerald-600 dark:text-emerald-200",
          warm: "text-secondary",
        };

  return (
    <div className="flex items-center justify-center gap-3 text-center sm:justify-start sm:text-left">
      <MetricClusterIcon tone={tone} styles={styles} />
      <div>
        <p className={cn("text-xl font-semibold leading-none", styles.value)}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function MetricClusterIcon({
  styles,
  tone,
}: {
  styles: {
    accent: string;
    main: string;
    warm: string;
  };
  tone: "learned" | "review";
}) {
  if (tone === "learned") {
    return (
      <div className="relative size-12 shrink-0">
        <Icon icon={Student} weight="duotone" className={cn("absolute left-0.5 top-1.5 size-9", styles.main)} />
        <Icon icon={Layers3} weight="duotone" className={cn("absolute bottom-0 right-0 size-6", styles.accent)} />
        <Icon icon={Sparkles} weight="fill" className={cn("absolute right-1.5 top-0 size-3.5", styles.warm)} />
      </div>
    );
  }

  return (
    <div className="relative size-12 shrink-0">
      <Icon icon={Target} weight="duotone" className={cn("absolute left-0.5 top-0.5 size-10", styles.main)} />
      <Icon icon={Check} weight="bold" className={cn("absolute bottom-1.5 right-0 size-5", styles.accent)} />
      <Icon icon={Sparkles} weight="fill" className={cn("absolute right-1.5 top-0 size-3.5", styles.warm)} />
    </div>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 22 }).map((_, index) => (
        <span
          key={index}
          className="absolute top-[-12px] size-2 animate-[confetti-fall_1.9s_ease-in-out_infinite] rounded-[2px] odd:rounded-full"
          style={{
            left: `${(index * 37) % 100}%`,
            backgroundColor: [
              "var(--primary)",
              "var(--accent)",
              "var(--secondary)",
              "var(--foreground)",
            ][index % 4],
            animationDelay: `${index * 0.08}s`,
            transform: `rotate(${index * 19}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function summarizeResults(results: Record<string, PracticeGameResult[]>): PracticeSummary {
  const games = Object.values(results).flat();
  const correctGames = games.filter((game) => game.result === "correct").length;
  const skippedGames = games.filter((game) => game.result === "skipped").length;
  const score = games.reduce((total, game) => total + game.score, 0);
  const accuracy = games.length ? Math.round((correctGames / games.length) * 100) : 0;

  return {
    totalGames: games.length,
    correctGames,
    skippedGames,
    score,
    accuracy,
  };
}

function calculateGameScore(responseTime: number) {
  const remainingRatio = Math.max(0, GAME_TIME_LIMIT_MS - responseTime) / GAME_TIME_LIMIT_MS;
  return Math.max(1, Math.ceil(remainingRatio * 10));
}

function getFinishTitle(accuracy: number) {
  if (accuracy >= 90) return "Excellent run";
  if (accuracy >= 70) return "Strong practice";
  if (accuracy >= 50) return "Good effort";
  return "Keep training";
}

function getReviewBookId(book?: ReviewDueBook) {
  return book?.bookId ?? book?.id ?? "";
}

function getPracticeCountOptions(dueCount: number) {
  const options = [3, 6, 9, 12].filter((option) => option <= dueCount);

  if (dueCount > 0 && !options.length) {
    return [dueCount];
  }

  if (dueCount > 0 && !options.includes(dueCount) && dueCount < 12) {
    return [...options, dueCount];
  }

  return options.length ? options : [1];
}

function PromptView({
  card,
  game,
  prompt,
}: {
  card: Flashcard;
  game: PracticeGame;
  prompt: string | null;
}) {
  if (game.promptType === "translation") {
    return <div className="text-4xl font-semibold text-primary">{card.translation}</div>;
  }

  if (game.promptType === "example-blank") {
    return <p className="text-2xl leading-10">{prompt}</p>;
  }

  if (game.promptType === "image") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
        {card.imageUrl ? (
          <div
            className="h-80 bg-cover bg-center"
            style={{ backgroundImage: `url(${card.imageUrl})` }}
          />
        ) : (
          <div className="grid h-56 place-items-center text-muted-foreground">
            <Icon icon={ImageIcon} className="size-10" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4">
      <Icon icon={Headphones} className="size-8 text-primary" />
      <audio controls src={card.audioUrl ?? undefined} className="w-full" />
    </div>
  );
}

function getGameTitle(game: PracticeGame) {
  if (game.type === "translation-input") return "Type the word from translation";
  if (game.type === "example-blank-quiz") return "Choose the missing word";
  if (game.type === "image-quiz") return "Choose the word for this image";
  return "Type what you hear";
}

function mergeCards(primary: Flashcard[], secondary: Flashcard[]) {
  return Array.from(
    new Map([...primary, ...secondary].map((card) => [card.id, card])).values()
  );
}

function preloadMedia(cards: Flashcard[]) {
  cards.forEach((card) => {
    if (card.imageUrl) {
      const image = new Image();
      image.src = card.imageUrl;
    }
  });
}
