"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Microphone, SpeakerHigh, Stop, Trophy } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Flashcard } from "@/lib/dashboard-data";
import { http } from "@/lib/http";
import { unwrapListening } from "@/lib/listening";
import { scoreSpokenWords } from "@/lib/speaking-score";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
function recognitionConstructor() {
  const browser = window as SpeechWindow;
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
const subscribe = () => () => {};
const supported = () =>
  Boolean(window.isSecureContext && recognitionConstructor());

const speechErrors: Record<string, string> = {
  "not-allowed":
    "Microphone access is blocked. Allow it in your browser settings, then try again.",
  "service-not-allowed":
    "Speech recognition is blocked by your browser. Try another supported browser.",
  "audio-capture": "No microphone was found. Connect one and try again.",
  "no-speech": "We didn’t hear anything. Tap the microphone and try again.",
  network:
    "Speech recognition couldn’t connect. Check your connection and try again.",
  "language-not-supported":
    "English speech recognition isn’t available in this browser.",
};

export function SpeakingGame({
  cards,
  onClose,
}: {
  cards: Flashcard[];
  onClose: () => void;
}) {
  const canRecognize = useSyncExternalStore(subscribe, supported, () => false);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "starting" | "listening" | "processing"
  >("idle");
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [bestScores, setBestScores] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioRequestRef = useRef<AbortController | null>(null);
  const sentenceAudioCache = useRef(new Map<string, string>());
  const [audioLoading, setAudioLoading] = useState(false);
  const card = cards[index];
  const sentence = card?.example?.trim() ?? "";
  const busy = status !== "idle";

  function releaseMicrophone() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onstart =
        recognition.onresult =
        recognition.onerror =
        recognition.onend =
          null;
      try {
        recognition.abort();
      } catch {
        /* Already stopped. */
      }
    }
  }

  function stopAudio() {
    audioRequestRef.current?.abort();
    audioRequestRef.current = null;
    if (audioRef.current) {
      audioRef.current.onerror = null;
      audioRef.current.pause();
    }
    audioRef.current = null;
    setAudioLoading(false);
  }

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) {
        releaseMicrophone();
        stopAudio();
        setStatus("idle");
      }
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", stopWhenHidden);
      releaseMicrophone();
      stopAudio();
    };
  }, []);

  async function listen() {
    if (audioLoading) return;
    stopAudio();
    setMessage("");
    setAudioLoading(true);
    const controller = new AbortController();
    audioRequestRef.current = controller;
    try {
      const key = `${card.id}:${sentence}`;
      let url = card.exampleAudioUrl || sentenceAudioCache.current.get(key);
      if (!url) {
        const result = unwrapListening(
          await http.post<{ url: string } | { data: { url: string } }>(
            "/api/listening/sets/sentence-audio",
            { flashcardId: card.id },
            { signal: controller.signal },
          ),
        );
        url = result.url;
      }
      if (controller.signal.aborted) return;
      if (typeof url !== "string" || !/^https?:\/\//.test(url))
        throw new Error("Missing audio");
      sentenceAudioCache.current.set(key, url);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onerror = () => {
        if (audioRef.current === audio)
          setMessage("Sentence audio couldn’t load. Try again.");
      };
      await audio.play();
    } catch {
      if (!controller.signal.aborted)
        setMessage("Sentence audio couldn’t play. Please try again.");
    } finally {
      if (!controller.signal.aborted) setAudioLoading(false);
    }
  }

  function record() {
    if (busy || !canRecognize) return;
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    stopAudio();
    releaseMicrophone();
    setTranscript("");
    setScore(null);
    setMessage("");
    setStatus("starting");
    try {
      const recognition = new Constructor();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => {
        if (recognitionRef.current === recognition) setStatus("listening");
      };
      recognition.onresult = (event) => {
        if (recognitionRef.current !== recognition) return;
        const results = Array.from(event.results);
        const heard = results
          .map((result) => result[0].transcript)
          .join(" ")
          .trim();
        setTranscript(heard);
        if (!results.length || !results.every((result) => result.isFinal))
          return;
        if (!heard) {
          setMessage(speechErrors["no-speech"]);
        } else {
          const accuracy = scoreSpokenWords(sentence, heard);
          setScore(accuracy);
          setBestScores((scores) => ({
            ...scores,
            [card.id]: Math.max(scores[card.id] ?? 0, accuracy),
          }));
        }
        releaseMicrophone();
        setStatus("idle");
      };
      recognition.onerror = (event) => {
        if (recognitionRef.current !== recognition) return;
        setMessage(
          speechErrors[event.error] ??
            "Speech recognition stopped. Please try again.",
        );
        releaseMicrophone();
        setStatus("idle");
      };
      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        releaseMicrophone();
        setStatus("idle");
        setMessage("No speech result was returned. Please try again.");
      };
      timerRef.current = setTimeout(() => {
        releaseMicrophone();
        setStatus("idle");
        setMessage("Recording timed out. Tap the microphone to try again.");
      }, 60_000);
      recognition.start();
    } catch {
      releaseMicrophone();
      setStatus("idle");
      setMessage(
        "The microphone couldn’t start. Check your browser permissions and try again.",
      );
    }
  }

  function next() {
    releaseMicrophone();
    stopAudio();
    setStatus("idle");
    setTranscript("");
    setScore(null);
    setMessage("");
    if (index + 1 === cards.length) setComplete(true);
    else setIndex(index + 1);
  }

  if (!card) return <Button onClick={onClose}>Back to practice</Button>;
  if (complete) {
    const scores = Object.values(bestScores);
    const average = Math.round(
      scores.reduce((sum, value) => sum + value, 0) / cards.length,
    );
    return (
      <section className="[&_[data-slot=button]:focus-visible]:border-border [&_[data-slot=button]:focus-visible]:ring-border [&_[data-slot=button]:focus-visible]:underline mx-auto grid w-full max-w-lg justify-items-center gap-5 py-12 text-center">
        <Icon icon={Trophy} className="size-16 text-primary" weight="duotone" />
        <h1 className="text-3xl font-bold">Speaking round complete!</h1>
        <p className="text-4xl font-bold text-primary">{average}%</p>
        <p className="text-sm text-muted-foreground">
          Word accuracy · {scores.length} of {cards.length} sentences attempted
        </p>
        <p className="text-xs text-muted-foreground">
          Your best attempt for each sentence counts. Scores stay in this round.
        </p>
        <Button onClick={onClose}>Back to practice</Button>
      </section>
    );
  }

  return (
    <section className="[&_[data-slot=button]:focus-visible]:border-border [&_[data-slot=button]:focus-visible]:ring-border [&_[data-slot=button]:focus-visible]:underline mx-auto grid w-full max-w-lg gap-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Say it</h1>
        <Button variant="ghost" onClick={onClose}>
          Exit
        </Button>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Sentence {index + 1} of {cards.length}
      </p>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Speaking progress"
        aria-valuemin={0}
        aria-valuemax={cards.length}
        aria-valuenow={index}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${(index / cards.length) * 100}%` }}
        />
      </div>
      <div className="grid justify-items-center gap-5 rounded-3xl border border-border bg-card px-5 py-8 text-center">
        <p className="text-xs text-muted-foreground">Read this aloud</p>
        <h2 className="max-w-full break-words text-xl font-semibold leading-relaxed sm:text-2xl">
          {sentence}
        </h2>
        {card.exampleTranslation ? (
          <p className="text-sm text-muted-foreground">
            {card.exampleTranslation}
          </p>
        ) : null}
        <Button
          variant="ghost"
          disabled={busy || audioLoading}
          onClick={() => void listen()}
        >
          <Icon icon={SpeakerHigh} />
          {audioLoading ? "Preparing audio…" : "Listen"}
        </Button>
        <Button
          className={`size-24 rounded-full focus-visible:border-border focus-visible:ring-border focus-visible:ring-offset-2 ${status === "listening" ? "motion-safe:animate-pulse" : ""}`}
          aria-label={
            busy
              ? "Stop recording"
              : score === null
                ? "Start speaking"
                : "Try again"
          }
          disabled={!canRecognize || audioLoading || status === "processing"}
          onClick={() => {
            if (busy) {
              setStatus("processing");
              try {
                recognitionRef.current?.stop();
              } catch {
                releaseMicrophone();
                setStatus("idle");
              }
            } else record();
          }}
        >
          <Icon
            icon={busy ? Stop : Microphone}
            className="size-10"
            weight="fill"
          />
        </Button>
        <p role="status" className="min-h-5 text-sm text-muted-foreground">
          {status === "starting"
            ? "Allow microphone access…"
            : status === "listening"
              ? "Listening… tap to finish"
              : status === "processing"
                ? "Checking your words…"
                : score === null
                  ? "Tap to speak"
                  : "Tap to try again"}
        </p>
        {!canRecognize ? (
          <p className="text-sm text-muted-foreground">
            Speech recognition isn’t available here. Use a browser with speech
            recognition on HTTPS.
          </p>
        ) : null}
        <div className="grid min-h-24 content-center gap-2" aria-live="polite">
          {transcript ? (
            <p className="break-words text-sm">Heard: “{transcript}”</p>
          ) : null}
          {score !== null ? (
            <>
              <p className="text-3xl font-bold text-primary">{score}%</p>
              <p className="text-sm">
                {score === 100 ? "Nice work!" : "Give it another try!"}{" "}
                <span className="text-muted-foreground">Word accuracy</span>
              </p>
            </>
          ) : null}
          {message ? (
            <p role="alert" className="text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Checks recognized words, not pronunciation. Your browser may send
          audio to its speech service.
        </p>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={next}>
          Skip
        </Button>
        <Button disabled={score === null || busy} onClick={next}>
          {index + 1 === cards.length ? "Finish" : "Next"}
        </Button>
      </div>
    </section>
  );
}
