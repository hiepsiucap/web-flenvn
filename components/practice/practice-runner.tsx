"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Headphones,
  ImageIcon,
  Layers3,
  Loader2,
  Play,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HttpError, http } from "@/lib/http";
import type { ApiErrorResponse, ApiEnvelope } from "@/lib/auth-types";
import type { Flashcard, ReviewDueBook } from "@/lib/dashboard-data";
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
  const [limit, setLimit] = useState(Math.min(selectedBook?.dueForReview ?? 0, 5) || 1);
  const [message, setMessage] = useState("");
  const [steps, setSteps] = useState<PracticeStep[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(GAME_TIME_LIMIT_MS);
  const [results, setResults] = useState<Record<string, PracticeGameResult[]>>({});
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitAnswerRef = useRef<(value: string, skipped?: boolean) => void>(() => {});
  const current = steps[index];
  const progress = steps.length ? Math.round((index / steps.length) * 100) : 0;
  const completedGames = Object.values(results).flat();
  const totalCorrect = completedGames.filter((item) => item.result === "correct").length;
  const liveScore = completedGames.reduce((total, item) => total + item.score, 0);
  const totalDue = books.reduce((total, book) => total + book.dueForReview, 0);
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
      setSteps(nextSteps);
      setIndex(0);
      setAnswer("");
      setResults({});
      setSummary(null);
      setStartedAt(getNow());
      setRunStartedAt(getNow());
      setTimeLeftMs(GAME_TIME_LIMIT_MS);
    } catch (error) {
      const nextMessage = getErrorMessage(error, "Unable to start practice");
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  });

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
              <ResultMetric icon={<Trophy className="size-4" />} label="Score" value={String(summary.score)} />
              <ResultMetric icon={<Sparkles className="size-4" />} label="Accuracy" value={`${summary.accuracy}%`} />
              <ResultMetric icon={<Check className="size-4" />} label="Correct" value={`${summary.correctGames}/${summary.totalGames}`} />
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
                <Play className="size-4" />
                Practice again
              </Button>
            </div>
          </div>
        </section>
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
              <Trophy className="size-4 text-primary" />
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
              <Clock3 className="size-4" />
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
                {current.game.choices?.map((choice) => (
                  <Button
                    key={choice}
                    type="button"
                    variant="outline"
                    className="h-12 justify-start rounded-2xl px-4 text-left"
                    disabled={isSubmitting}
                    onClick={() => submitAnswer(choice)}
                  >
                    {choice}
                  </Button>
                ))}
              </div>
            ) : (
              <form
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
                  <Check className="size-4" />
                  Answer
                </Button>
              </form>
            )}
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                disabled={isSubmitting}
                onClick={() => submitAnswer("", true)}
              >
                <X className="size-4" />
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
    <div className="grid max-w-5xl gap-5">
      <section className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Review</p>
        <h1 className="text-3xl font-semibold">Choose your mission</h1>
        <p className="text-sm text-muted-foreground">
          {totalDue} cards due. Each card can become translation, sentence, image, and audio rounds.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3">
          {books.map((book) => {
            const isSelected = bookId === getReviewBookId(book);

            return (
              <button
                key={getReviewBookId(book)}
                type="button"
                className={[
                  "grid gap-2 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isSelected
                    ? "border-primary shadow-md shadow-brand-800/10"
                    : "border-border",
                ].join(" ")}
                onClick={() => {
                  setBookId(getReviewBookId(book));
                  setLimit(Math.min(book.dueForReview || 1, 5));
                  setMessage("");
                }}
              >
                <div className="flex items-start gap-3">
                  {book.coverImage ? (
                    <div
                      className="h-20 w-16 shrink-0 rounded-xl bg-secondary bg-cover bg-center"
                      style={{ backgroundImage: `url(${book.coverImage})` }}
                    />
                  ) : (
                    <div className="grid h-20 w-16 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground">
                      <Layers3 className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-lg font-semibold">{book.title}</p>
                      <Badge variant={book.dueForReview ? "secondary" : "outline"} className="shrink-0 rounded-2xl">
                        {book.dueForReview} due
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {book.totalCards} cards in deck
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>10s rounds</span>
                      <span>Up to {Math.min(book.dueForReview || 0, 5) * 40} pts</span>
                      <span>{book.dueForReview ? "Ready" : "Resting"}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Mission setup</CardTitle>
            <CardDescription>{selectedBook?.title ?? "Choose a book"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={startPractice}>
            <div className="grid gap-2">
              <Label htmlFor="practice-count">Cards</Label>
              <Input
                id="practice-count"
                className="h-10"
                type="number"
                min={1}
                max={selectedBook?.dueForReview ?? 1}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              />
            </div>
            <Button
              type="submit"
              className="h-11 rounded-2xl"
              disabled={isLoading || !selectedBook || selectedBook.dueForReview <= 0}
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Start mission
            </Button>
          </form>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <p>Target: {limit} card{limit === 1 ? "" : "s"}</p>
            <p>Possible score: {maxScore}</p>
            <p>Rule: faster correct answers keep more points.</p>
          </div>
          {message ? (
            <p className="mt-3 text-sm text-destructive">{message}</p>
          ) : selectedBook?.dueForReview === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This book has no cards due right now.
            </p>
          ) : null}
          </CardContent>
        </Card>
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
            <ImageIcon className="size-10" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4">
      <Headphones className="size-8 text-primary" />
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
