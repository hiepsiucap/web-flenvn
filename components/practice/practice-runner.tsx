"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import {
  Check,
  Clock as Clock3,
  CaretLeft,
  CaretRight,
  SpeakerHigh,
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
import { ProgressCelebration } from "@/components/progress/progress-celebration";
import { StreakCompletionDialog } from "@/components/streak/streak-completion-dialog";
import { useStreak } from "@/components/streak/streak-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { HttpError, http } from "@/lib/http";
import { playGameSound, preloadGameSounds } from "@/lib/game-audio";
import type { ApiErrorResponse, ApiEnvelope } from "@/lib/auth-types";
import type { Flashcard, ReviewDueBook, UserProfile } from "@/lib/dashboard-data";
import type { SessionResponse, StreakProgress } from "@/lib/streak-types";
import {
  createProgressTransition,
  type ProgressTransition,
} from "@/lib/progress-transition";
import { cn } from "@/lib/utils";
import penguinPlayGame from "@/img/penguin-playgame.png";
import practiceCompletePenguin from "@/img/practice-complete-penguin.png";
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

type AnswerFeedback = {
  result: PracticeGameResult["result"];
  selectedAnswer: string;
  correctAnswer: string;
  score: number;
  canRetry?: boolean;
};

const GAME_TIME_LIMIT_MS = 10000;
const ANSWER_FEEDBACK_MS = 1400;
const MAX_GAME_SCORE = 100;
const SCORE_LOSS_PER_SECOND = 10;

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

function getProfileData(data: ApiEnvelope<UserProfile> | UserProfile) {
  return "success" in data ? data.data : data;
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
  const { applyStreakProgress, refreshStreak } = useStreak();
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
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);
  const [progressTransition, setProgressTransition] =
    useState<ProgressTransition | null>(null);
  const [streakCompletion, setStreakCompletion] = useState<StreakProgress | null>(null);
  const answerLockedRef = useRef(false);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const submitAnswerRef = useRef<(value: string, skipped?: boolean) => void>(() => {});
  const profileBeforeRef = useRef<UserProfile | null>(null);
  const current = steps[index];
  const progress = steps.length ? Math.round((index / steps.length) * 100) : 0;
  const completedGames = Object.values(results).flat();
  const totalCorrect = completedGames.filter((item) => item.result === "correct").length;
  const liveScore = completedGames.reduce((total, item) => total + item.score, 0);
  const totalDue = books.reduce((total, book) => total + book.dueForReview, 0);
  const totalCards = books.reduce((total, book) => total + book.totalCards, 0);
  const countOptions = getPracticeCountOptions(selectedBook?.dueForReview ?? 0);
  const availableScore = calculateGameScore(GAME_TIME_LIMIT_MS - timeLeftMs);

  useEffect(() => {
    preloadGameSounds();
  }, []);

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
      const [response, profileBefore] = await Promise.all([
        http.get<ApiEnvelope<Flashcard[]> | Flashcard[]>(
          "/api/flashcards/review/due",
          {
            query: {
              bookId,
              limit: Math.min(limit, selectedBook.dueForReview),
            },
          }
        ),
        http
          .get<ApiEnvelope<UserProfile> | UserProfile>("/api/users/profile")
          .then(getProfileData)
          .catch(() => null),
      ]);
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
        setMessage("These due cards do not have enough definition, example, image, or audio data yet.");
        toast.error("No playable games found for these cards");
        return;
      }

      preloadMedia(dueCards);
      profileBeforeRef.current = profileBefore;
      setReviewCards(dueCards);
      setReviewSteps(nextSteps);
      setReviewIndex(0);
      setIsReviewFlipped(false);
      setSteps([]);
      setIndex(0);
      setAnswer("");
      setAnswerFeedback(null);
      answerLockedRef.current = false;
      setResults({});
      setSummary(null);
      setProgressTransition(null);
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
    setAnswerFeedback(null);
    answerLockedRef.current = false;
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
      const sessionResponse = await http.post<ApiEnvelope<SessionResponse> | SessionResponse>("/api/sessions/practice", {
        bookId: selectedBook.bookId,
        durationMs: Math.round(getNow() - runStartedAt),
        flashcards,
      });
      const sessionData = "data" in sessionResponse ? sessionResponse.data : sessionResponse;
      if (sessionData.streakProgress) {
        applyStreakProgress(sessionData.streakProgress);
        if (sessionData.streakProgress.justCompleted) setStreakCompletion(sessionData.streakProgress);
        void refreshStreak();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Practice finished, but saving failed"));
      setIsSubmitting(false);
      return;
    }

    let nextTransition: ProgressTransition | null = null;

    try {
      const profileResponse = await http.get<
        ApiEnvelope<UserProfile> | UserProfile
      >("/api/users/profile");
      const profileAfter = getProfileData(profileResponse);
      const profileBefore = profileBeforeRef.current;

      if (profileBefore) {
        nextTransition = createProgressTransition(profileBefore, profileAfter);
      }

      profileBeforeRef.current = profileAfter;
    } catch {
      toast.warn("Practice saved, but progress could not be refreshed");
    }

    const shouldCelebrate = Boolean(
      nextTransition &&
      (nextTransition.xpEarned > 0 ||
        nextTransition.leveledUp ||
        nextTransition.rankedUp)
    );

    if (nextTransition && shouldCelebrate) {
      await preloadRankBadge(nextTransition);
    }

    toast.success("Practice saved");
    setSteps([]);
    setIndex(0);
    setSummary(nextSummary);
    setProgressTransition(shouldCelebrate ? nextTransition : null);
    setIsSubmitting(false);
    router.refresh();
  }

  async function submitAnswer(value: string, skipped = false) {
    if (!current || answerLockedRef.current) return;

    const correct = !skipped && isCorrectAnswer(value, current.game.answer);

    if (!skipped) {
      playGameSound(correct ? "correct" : "incorrect");
    }

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

    if (current.game.mechanism === "input" && !skipped && !correct) {
      setResults(nextResults);
      setAnswerFeedback({
        result: "incorrect",
        selectedAnswer: value,
        correctAnswer: current.game.answer,
        score: 0,
        canRetry: true,
      });
      setAnswer("");
      return;
    }

    answerLockedRef.current = true;
    setIsSubmitting(true);

    setResults(nextResults);
    setAnswerFeedback({
      result: result.result,
      selectedAnswer: value,
      correctAnswer: current.game.answer,
      score: result.score,
    });

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, ANSWER_FEEDBACK_MS);
    });

    setAnswerFeedback(null);
    setAnswer("");

    if (index + 1 >= steps.length) {
      await finishPractice(nextResults);
      answerLockedRef.current = false;
      return;
    }

    setIndex(index + 1);
    setStartedAt(getNow());
    setTimeLeftMs(GAME_TIME_LIMIT_MS);
    setIsSubmitting(false);
    answerLockedRef.current = false;
  }

  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  });

  useEffect(() => {
    if (!answerFeedback?.canRetry) return;

    const focusTimer = window.setTimeout(() => {
      answerInputRef.current?.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [answerFeedback]);

  useEffect(() => {
    if (summary) {
      playGameSound("complete");
    }
  }, [summary]);

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
      <>
        {streakCompletion ? (
          <StreakCompletionDialog progress={streakCompletion} onComplete={() => setStreakCompletion(null)} />
        ) : progressTransition ? (
          <ProgressCelebration
            transition={progressTransition}
            open
            onComplete={() => setProgressTransition(null)}
          />
        ) : null}
        <div className="mx-auto grid w-full max-w-4xl gap-4">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-10 shadow-sm sm:px-8 sm:py-12">
          <Confetti />
          <div className="relative z-10 grid items-center gap-y-14 md:grid-cols-[minmax(12rem,0.7fr)_minmax(0,1.3fr)] md:gap-x-12 lg:gap-x-16">
            <div className="grid justify-items-center gap-7">
              <NextImage
                src={practiceCompletePenguin}
                alt="Penguin celebrating practice completion"
                className="h-auto w-full max-w-60 object-contain"
                priority
              />
              <div className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground">
                <Icon icon={CaretRight} className="text-primary" weight="bold" />
                {summary.skippedGames
                  ? `${summary.skippedGames} skipped game${summary.skippedGames === 1 ? "" : "s"}`
                  : "No skipped games"}
              </div>
            </div>

            <div className="grid gap-8 text-center md:text-left">
              <div>
                <Badge variant="secondary" className="rounded-xl px-3 py-1 text-sm">
                  <Icon icon={Sparkles} weight="fill" />
                  Practice complete
                </Badge>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                  {getFinishTitle(summary.accuracy)}!
                </h1>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground md:mx-0 sm:text-base">
                  {getFinishMessage(summary.accuracy)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <ResultMetric icon={<Icon icon={Trophy} weight="fill" />} label="Score" value={String(summary.score)} />
                <ResultMetric icon={<Icon icon={Target} weight="fill" />} label="Accuracy" value={`${summary.accuracy}%`} />
                <ResultMetric icon={<Icon icon={Check} weight="bold" />} label="Correct" value={`${summary.correctGames}/${summary.totalGames}`} />
              </div>

              <div className="flex justify-center md:justify-end">
                <Button
                  type="button"
                  className="h-10 w-full rounded-xl px-6 sm:w-auto"
                  onClick={() => setSummary(null)}
                >
                  <Icon icon={Play} weight="fill" />
                  Practice again
                </Button>
              </div>
            </div>
          </div>
        </section>
        </div>
      </>
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
      <div className="mx-auto grid w-full max-w-4xl gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Practice</p>
            <h1 className="text-xl font-semibold">{selectedBook?.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="relative inline-flex h-8 items-center rounded-full border border-secondary/70 bg-secondary/15 px-2.5 shadow-sm"
              aria-label={`${liveScore} XP`}
              aria-live="polite"
            >
              <span
                key={`score-${liveScore}`}
                className="inline-flex items-center gap-1.5 animate-[score-pop_450ms_cubic-bezier(0.2,0.9,0.3,1)] motion-reduce:animate-none"
              >
                <Icon icon={Trophy} className="size-4 text-secondary" weight="fill" />
                <span className="min-w-5 text-right text-sm font-extrabold tabular-nums text-primary">
                  {liveScore}
                </span>
                <span className="text-[0.6rem] font-extrabold uppercase tracking-wide text-muted-foreground">
                  XP
                </span>
              </span>
              {liveScore > 0 ? (
                <Icon
                  key={`score-spark-${liveScore}`}
                  icon={Sparkles}
                  className="pointer-events-none absolute -right-1.5 -top-1.5 size-4 animate-[score-spark_550ms_ease-out_forwards] text-secondary motion-reduce:animate-none"
                  weight="fill"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <Badge variant="outline" className="h-7 rounded-2xl px-2.5">
              {index + 1} / {steps.length}
            </Badge>
          </div>
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={Sparkles} className="size-3.5 text-secondary" weight="fill" />
              Stage {index + 1} of {steps.length}
            </span>
            <span className="inline-flex items-center gap-2 tabular-nums">
              <span
                className={cn(
                  "font-extrabold text-primary",
                  availableScore <= 30 && "text-destructive"
                )}
              >
                {availableScore} XP
              </span>
              <Icon
                icon={Clock3}
                className={cn(
                  "size-3.5 text-primary",
                  timeLeftMs <= 3000 && "text-destructive"
                )}
              />
              {Math.ceil(timeLeftMs / 1000)}s
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary/55">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
            <div className="pointer-events-none absolute inset-0 flex">
              {steps.map((step, segment) => (
                <span
                  key={`${step.card.id}-${segment}`}
                  className="flex-1 border-r border-background/60 last:border-r-0"
                />
              ))}
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-secondary/45">
            <div
              className={cn(
                "h-full rounded-full bg-accent transition-[width] duration-100",
                timeLeftMs <= 3000 && "bg-destructive"
              )}
              style={{ width: `${(timeLeftMs / GAME_TIME_LIMIT_MS) * 100}%` }}
            />
          </div>
        </div>

        <Card size="sm" className="overflow-hidden rounded-3xl">
          <CardHeader className="h-20">
            <div className="flex h-full min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>{getGameTitle(current.game)}</CardTitle>
                <CardDescription>{current.card.partOfSpeech || "Flashcard"}</CardDescription>
              </div>
              <Badge variant="outline" className="rounded-2xl capitalize">
                {current.game.mechanism}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="grid h-56 min-w-0 place-items-center overflow-hidden rounded-2xl">
              <PromptView card={current.card} game={current.game} prompt={prompt} />
            </div>
            <div className="grid h-32 content-center">
              {current.game.mechanism === "quiz" ? (
                <div className="grid grid-cols-2 gap-3">
                  {current.game.choices?.map((choice) => (
                    <Button
                      key={choice}
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-14 min-w-0 justify-start rounded-2xl px-4 text-left text-sm transition-colors sm:text-base",
                        answerFeedback &&
                          isCorrectAnswer(choice, answerFeedback.correctAnswer) &&
                          "border-emerald-500 bg-emerald-50 text-emerald-700 disabled:opacity-100 dark:bg-emerald-950/30 dark:text-emerald-300",
                        answerFeedback?.result === "incorrect" &&
                          isCorrectAnswer(choice, answerFeedback.selectedAnswer) &&
                          "border-destructive bg-destructive/10 text-destructive disabled:opacity-100"
                      )}
                      disabled={isSubmitting}
                      onClick={() => submitAnswer(choice)}
                    >
                      <span className="min-w-0 truncate">{choice}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <Form
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitAnswer(answer);
                  }}
                >
                  <div className="relative min-w-0">
                    <Input
                      ref={answerInputRef}
                      className={cn(
                        "h-14 transition-colors",
                        answerFeedback && "pr-20",
                        answerFeedback?.result === "correct" &&
                          "!border-emerald-500 !ring-3 !ring-emerald-500/20",
                        answerFeedback?.result === "incorrect" &&
                          "!border-destructive !text-destructive !ring-3 !ring-destructive/20"
                      )}
                      value={answer}
                      onChange={(event) => {
                        playGameSound("type");
                        setAnswer(event.target.value);

                        if (answerFeedback?.canRetry) {
                          setAnswerFeedback(null);
                        }
                      }}
                      autoFocus
                      placeholder="Type your answer"
                      aria-invalid={answerFeedback?.result === "incorrect"}
                      aria-describedby={
                        answerFeedback?.result === "correct" ||
                        answerFeedback?.result === "incorrect"
                          ? "typed-answer-status"
                          : undefined
                      }
                      readOnly={Boolean(answerFeedback && !answerFeedback.canRetry)}
                    />
                    {answerFeedback?.result === "correct" ? (
                      <span
                        id="typed-answer-status"
                        className="pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-300"
                      >
                        <Icon icon={Check} className="size-3.5" weight="bold" />
                        Correct
                      </span>
                    ) : answerFeedback?.result === "incorrect" ? (
                      <span
                        id="typed-answer-status"
                        className="pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 text-xs font-bold text-destructive"
                      >
                        <Icon icon={X} className="size-3.5" weight="bold" />
                        Wrong
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="submit"
                    className="h-14 rounded-2xl"
                    disabled={isSubmitting || !answer.trim()}
                  >
                    <Icon icon={Check} />
                    Answer
                  </Button>
                </Form>
              )}
            </div>
            <div className="flex h-9 items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={isSubmitting}
                onClick={() => submitAnswer("", true)}
              >
                <Icon icon={X} />
                Skip
              </Button>
              {answerFeedback ? (
                <p
                  key={`${current.game.id}-${answerFeedback.result}`}
                  role="status"
                  className={cn(
                    "max-w-[72%] truncate text-right text-xs font-semibold animate-[score-pop_350ms_ease-out] motion-reduce:animate-none",
                    answerFeedback.result === "correct"
                      ? "text-emerald-600 dark:text-emerald-300"
                      : answerFeedback.result === "incorrect"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  )}
                  title={
                    answerFeedback.canRetry
                      ? "Wrong. Try again."
                      : answerFeedback.result === "correct"
                      ? `Correct! +${answerFeedback.score} XP`
                      : `${answerFeedback.result === "skipped" ? "Skipped" : "Not quite"}. Correct answer: ${answerFeedback.correctAnswer}`
                  }
                >
                  {answerFeedback.canRetry
                    ? "Wrong - Try again"
                    : answerFeedback.result === "correct"
                    ? `Correct! +${answerFeedback.score} XP`
                    : `${answerFeedback.result === "skipped" ? "Skipped" : "Not quite"} - Answer: ${answerFeedback.correctAnswer}`}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{totalCorrect} correct</p>
              )}
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
            Target: {limit} word{limit === 1 ? "" : "s"} · Up to 100 XP per game
          </p>
          <p>Every second costs 10 XP, so answer fast.</p>
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
    <div className="grid min-h-28 place-items-center rounded-xl border border-border bg-background p-4 text-center shadow-sm">
      <div className="text-primary [&_svg]:size-7">
        {icon}
      </div>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-primary">{value}</p>
      <div className="mt-1 h-1 w-16 rounded-full bg-primary/15" aria-hidden="true" />
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
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !card.audioUrl) return;

    audio.currentTime = 0;
    void audio.play().catch(() => undefined);

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [card.id, card.audioUrl]);

  return (
    <>
      {card.audioUrl ? (
        <audio
          ref={audioRef}
          className="hidden"
          preload="auto"
          src={card.audioUrl}
        />
      ) : null}
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
    </>
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
  const elapsedSeconds = Math.floor(Math.max(0, responseTime) / 1000);
  return Math.max(
    0,
    MAX_GAME_SCORE - elapsedSeconds * SCORE_LOSS_PER_SECOND
  );
}

function getFinishTitle(accuracy: number) {
  if (accuracy >= 90) return "Excellent run";
  if (accuracy >= 70) return "Strong practice";
  if (accuracy >= 50) return "Good effort";
  return "Keep training";
}

function getFinishMessage(accuracy: number) {
  if (accuracy >= 90) return "Outstanding work. Your vocabulary recall is getting stronger.";
  if (accuracy >= 70) return "Great work. Keep practicing to make every word stick.";
  if (accuracy >= 50) return "You did well. Keep practicing and you will get even better.";
  return "Every round builds recall. Give it another go and keep improving.";
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
  const audioRef = useRef<HTMLAudioElement>(null);

  function replayAudio() {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;
    void audioRef.current.play().catch(() => undefined);
  }

  if (game.promptType === "definition") {
    return (
      <div className="grid h-full w-full min-w-0 place-items-center px-4 text-center">
        <div className="grid max-w-2xl gap-3">
          <p className="break-words text-2xl font-semibold text-primary sm:text-3xl">
            {card.definition}
          </p>
          {card.translation ? (
            <p className="break-words text-base text-muted-foreground sm:text-lg">
              {card.translation}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (game.promptType === "example-blank") {
    return (
      <div className="grid h-full w-full min-w-0 place-items-center overflow-y-auto px-4 text-center">
        <p className="max-w-2xl break-words text-xl leading-8 sm:text-2xl sm:leading-10">
          {prompt}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center gap-3">
      {card.imageUrl ? (
        <div
          className={cn(
            "h-full w-96 min-w-0 rounded-2xl bg-cover bg-center bg-no-repeat",
            card.audioUrl ? "max-w-[calc(100%_-_3.75rem)]" : "max-w-full"
          )}
          style={{ backgroundImage: `url(${card.imageUrl})` }}
          role="img"
          aria-label="Vocabulary prompt"
        />
      ) : null}
      {card.audioUrl ? (
        <>
          <audio ref={audioRef} autoPlay preload="auto" src={card.audioUrl} />
          <Button
            type="button"
            size="icon-lg"
            variant="ghost"
            className="size-12 rounded-full text-primary"
            onClick={replayAudio}
            aria-label="Replay audio"
            title="Replay audio"
          >
            <Icon icon={SpeakerHigh} className="size-8" weight="fill" />
          </Button>
        </>
      ) : null}
    </div>
  );
}

function getGameTitle(game: PracticeGame) {
  if (game.type === "definition-input") return "Type the word from the definition";
  if (game.type === "example-blank-quiz") return "Choose the missing word";
  return "Type the English word";
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

function preloadRankBadge(transition: ProgressTransition) {
  if (!transition.rankedUp || !transition.currentRank.imageUrl) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(finish, 2500);

    function finish() {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve();
    }

    image.onload = finish;
    image.onerror = finish;
    image.src = transition.currentRank.imageUrl;
  });
}
