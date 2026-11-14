"use client";
import { useEffect, useRef, useState } from "react";
import { Headphones, Spinner, Trophy } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Flashcard } from "@/lib/dashboard-data";
import { http, HttpError } from "@/lib/http";
import {
  parseListeningRound,
  unwrapListening,
  waitForListeningPoll,
  type ListeningDifficulty,
  type ListeningFeedback,
  type ListeningGameType,
  type ListeningRound,
} from "@/lib/listening";
import { PracticeAudioPlayer } from "./practice-audio-player";

const games: { type: ListeningGameType; name: string; description: string }[] =
  [
    {
      type: "quick-reply",
      name: "Quick reply",
      description: "Hear a question. Choose the best response.",
    },
    {
      type: "catch-details",
      name: "Catch the details",
      description: "Listen for a name, time, number, or short detail.",
    },
    {
      type: "conversation",
      name: "Conversation challenge",
      description: "Follow a short conversation and answer a question.",
    },
  ];
function failure(error: unknown) {
  if (error instanceof HttpError && error.status === 429)
    return "Too many generation requests. Wait a minute and try again.";
  return "Listening practice couldn’t load. Please try again.";
}

export function ListeningGame({
  cards,
  onClose,
}: {
  cards: Flashcard[];
  onClose: () => void;
}) {
  const [game, setGame] = useState<ListeningGameType>("quick-reply");
  const [difficulty, setDifficulty] = useState<ListeningDifficulty>("easy");
  const [challenge, setChallenge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [round, setRound] = useState<ListeningRound | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [heard, setHeard] = useState(false);
  const [feedback, setFeedback] = useState<ListeningFeedback | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [complete, setComplete] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const question = round?.questions[index];

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  async function generate() {
    if (lock.current || !cards.length || cards.length > 20) return;
    lock.current = true;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setMessage("");
    setRound(null);
    try {
      let next = parseListeningRound(
        await http.post(
          "/api/listening/sets",
          { flashcardIds: cards.map((card) => card.id), game, difficulty },
          { signal: controller.signal },
        ),
      );
      const deadline = Date.now() + 180_000;
      while (next.status === "generating") {
        if (Date.now() > deadline) throw new Error("Generation timed out");
        await waitForListeningPoll(controller.signal);
        next = parseListeningRound(
          await http.get(`/api/listening/sets/${next.id}`, {
            signal: controller.signal,
          }),
        );
      }
      if (next.status !== "ready") throw new Error("Generation failed");
      if (controller.signal.aborted) return;
      setRound(next);
      setIndex(0);
      setAnswer("");
      setHeard(false);
      setFeedback(null);
      setCorrectCount(0);
      setComplete(false);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(failure(error));
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        lock.current = false;
      }
    }
  }

  async function checkAnswer() {
    if (
      lock.current ||
      !round ||
      !question ||
      !heard ||
      !answer.trim() ||
      feedback
    )
      return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const result = unwrapListening(
        await http.post<ListeningFeedback | { data: ListeningFeedback }>(
          `/api/listening/sets/${round.id}/answers`,
          { questionId: question.id, answer },
          { signal: controller.signal },
        ),
      );
      if (
        result.questionId !== question.id ||
        typeof result.correct !== "boolean" ||
        typeof result.transcript !== "string" ||
        typeof result.explanation !== "string" ||
        typeof result.correctAnswer !== "string"
      )
        throw new Error("Invalid feedback");
      if (controller.signal.aborted) return;
      setFeedback(result);
      if (result.correct) setCorrectCount((value) => value + 1);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(failure(error));
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        lock.current = false;
      }
    }
  }
  function next() {
    if (busy) return;
    if (index + 1 === round?.questions.length) setComplete(true);
    else setIndex((value) => value + 1);
    setAnswer("");
    setHeard(false);
    setFeedback(null);
    setMessage("");
  }

  const header = (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-xl font-bold">Listening</h1>
      <Button variant="ghost" onClick={onClose}>
        Exit
      </Button>
    </div>
  );
  if (complete && round)
    return (
      <section className="[&_[data-slot=button]:focus-visible]:border-border [&_[data-slot=button]:focus-visible]:ring-border [&_[data-slot=button]:focus-visible]:underline mx-auto grid w-full max-w-xl justify-items-center gap-5 py-10 text-center">
        <Icon icon={Trophy} className="size-16 text-primary" weight="duotone" />
        <h1 className="text-3xl font-bold">Listening round complete!</h1>
        <p className="text-4xl font-bold text-primary">
          {Math.round((correctCount / round.questions.length) * 100)}%
        </p>
        <p>
          {correctCount} of {round.questions.length} correct
        </p>
        <p className="text-xs text-muted-foreground">
          Practice accuracy, not an exam score. This round doesn’t update XP or
          review progress.
        </p>
        <Button onClick={onClose}>Back to practice</Button>
      </section>
    );
  if (round && question)
    return (
      <section className="[&_[data-slot=button]:focus-visible]:border-border [&_[data-slot=button]:focus-visible]:ring-border [&_[data-slot=button]:focus-visible]:underline mx-auto grid w-full max-w-xl gap-5 py-4">
        {header}
        <p className="text-center text-sm text-muted-foreground">
          Question {index + 1} of {round.questions.length}
        </p>
        <div className="grid gap-6 rounded-3xl border border-border bg-card p-5 sm:p-7">
          <PracticeAudioPlayer
            key={question.id}
            urls={question.audioUrls}
            challenge={challenge}
            onComplete={() => setHeard(true)}
          />
          <h2 className="text-lg font-semibold">{question.prompt}</h2>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void checkAnswer();
            }}
          >
            {question.choices ? (
              <div
                className="grid gap-2"
                role="group"
                aria-label="Answer choices"
              >
                {question.choices.map((choice, i) => (
                  <Button
                    type="button"
                    variant="outline"
                    key={i}
                    disabled={busy || Boolean(feedback)}
                    aria-pressed={answer === String(i)}
                    className={`h-auto min-h-12 justify-start whitespace-normal rounded-2xl border-border p-3 text-left focus-visible:border-border focus-visible:ring-border focus-visible:ring-offset-2 ${answer === String(i) ? "bg-primary/10 text-primary" : ""}`}
                    onClick={() => setAnswer(String(i))}
                  >
                    <span className="mr-3 shrink-0 text-xs text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {choice}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="listening-answer">Your answer</Label>
                <Input
                  id="listening-answer"
                  value={answer}
                  maxLength={200}
                  autoComplete="off"
                  disabled={busy || Boolean(feedback)}
                  onChange={(event) => setAnswer(event.target.value)}
                  className="focus-visible:border-border focus-visible:ring-border focus-visible:ring-offset-2"
                />
              </div>
            )}
            {!feedback ? (
              <Button type="submit" disabled={busy || !heard || !answer.trim()}>
                {busy ? "Checking…" : "Check answer"}
              </Button>
            ) : null}
            {!heard && !feedback ? (
              <p className="text-center text-xs text-muted-foreground">
                Listen to the full recording before checking your answer.
              </p>
            ) : null}
          </form>
          {feedback ? (
            <div className="grid gap-3" aria-live="polite">
              <p className="font-semibold text-primary">
                {feedback.correct ? "Nice work!" : "Keep practicing!"}
              </p>
              <p className="text-sm">Answer: {feedback.correctAnswer}</p>
              <p className="text-sm text-muted-foreground">
                {feedback.explanation}
              </p>
              <details open>
                <summary className="cursor-pointer rounded text-sm font-medium focus-visible:bg-accent/30 focus-visible:outline-none focus-visible:underline">
                  Transcript
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {feedback.transcript}
                </p>
              </details>
            </div>
          ) : null}
          {message ? (
            <p role="alert" className="text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button
            variant={feedback ? "default" : "ghost"}
            disabled={busy}
            onClick={next}
          >
            {feedback
              ? index + 1 === round.questions.length
                ? "Finish"
                : "Next"
              : "Skip"}
          </Button>
        </div>
      </section>
    );
  return (
    <section className="[&_[data-slot=button]:focus-visible]:border-border [&_[data-slot=button]:focus-visible]:ring-border [&_[data-slot=button]:focus-visible]:underline mx-auto grid w-full max-w-xl gap-6 py-4">
      {header}
      <div className="grid justify-items-center gap-2 text-center">
        <Icon
          icon={Headphones}
          className="size-12 text-primary"
          weight="duotone"
        />
        <p className="text-sm text-muted-foreground">
          Five questions using your selected vocabulary.
        </p>
      </div>
      <div className="grid gap-2" role="group" aria-label="Listening games">
        {games.map((item) => (
          <Button
            key={item.type}
            variant="outline"
            aria-pressed={game === item.type}
            disabled={busy}
            className={`h-auto justify-start whitespace-normal rounded-2xl border-border p-4 text-left focus-visible:border-border focus-visible:ring-border focus-visible:ring-offset-2 ${game === item.type ? "bg-primary/10" : ""}`}
            onClick={() => setGame(item.type)}
          >
            <span className="grid gap-1">
              <span className="font-semibold">{item.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {item.description}
              </span>
            </span>
          </Button>
        ))}
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Difficulty</p>
        <div className="flex gap-2" role="group" aria-label="Difficulty">
          {(["easy", "medium", "hard"] as const).map((level) => (
            <Button
              key={level}
              variant={difficulty === level ? "default" : "outline"}
              disabled={busy}
              aria-pressed={difficulty === level}
              className="flex-1 capitalize focus-visible:border-border focus-visible:ring-border focus-visible:ring-offset-2"
              onClick={() => setDifficulty(level)}
            >
              {level}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex gap-2" role="group" aria-label="Playback mode">
        <Button
          variant={challenge ? "outline" : "default"}
          disabled={busy}
          aria-pressed={!challenge}
          className="flex-1"
          onClick={() => setChallenge(false)}
        >
          Practice
        </Button>
        <Button
          variant={challenge ? "default" : "outline"}
          disabled={busy}
          aria-pressed={challenge}
          className="flex-1"
          onClick={() => setChallenge(true)}
        >
          Challenge
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {challenge
          ? "One full playback per question at normal speed."
          : "Replay and slow down the audio as often as you need."}{" "}
        Transcripts appear after answering.
      </p>
      {cards.length > 20 ? (
        <p role="alert" className="text-sm text-muted-foreground">
          Choose up to 20 words to generate a listening round.
        </p>
      ) : null}
      <Button
        disabled={busy || !cards.length || cards.length > 20}
        onClick={() => void generate()}
      >
        {busy ? (
          <>
            <Icon icon={Spinner} className="motion-safe:animate-spin" />
            Preparing your round…
          </>
        ) : (
          "Generate listening practice"
        )}
      </Button>
      <p
        role={busy ? "status" : undefined}
        className="text-center text-xs text-muted-foreground"
      >
        {busy
          ? "Creating questions and audio. This can take a couple of minutes."
          : "Prepared rounds are saved and reused."}
      </p>
      {message ? (
        <p role="alert" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </section>
  );
}
