"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  CaretLeft,
  CaretRight,
  Play,
  WarningCircle,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormDescription, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { HttpError, http } from "@/lib/http";

type ShadowingSentence = {
  id: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
};

type ShadowingResult = {
  videoId: string;
  url: string;
  title: string;
  language: string;
  sentenceCount: number;
  sentences: ShadowingSentence[];
};

type ApiResponse<T> = { success: boolean; data: T };

const supportedYouTubeUrl = /^https:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)[A-Za-z0-9_-]{11}(?:[?&#/].*)?$/i;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function errorMessage(error: unknown) {
  if (!(error instanceof HttpError)) return "The video could not be loaded right now.";
  if (error.status === 400) return "Enter a valid YouTube video link.";
  if (error.status === 401) return "Sign in to use shadowing.";
  if (error.status === 404) return "This video does not have usable captions in the selected language.";
  if (error.status === 429) return "Too many requests. Wait briefly and try again.";
  return "The video could not be loaded right now.";
}

export function ShadowingPlayer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [url, setUrl] = useState("");
  const [maxWords, setMaxWords] = useState("12");
  const [result, setResult] = useState<ShadowingResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState("");

  const currentSentence = result?.sentences[currentIndex];

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  function playerCommand(func: string, args: unknown[] = []) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "https://www.youtube-nocookie.com"
    );
  }

  function playSentence(index: number) {
    const sentence = result?.sentences[index];
    if (!sentence) return;

    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    setCurrentIndex(index);
    playerCommand("seekTo", [sentence.startSeconds, true]);
    playerCommand("playVideo");
    pauseTimerRef.current = setTimeout(
      () => playerCommand("pauseVideo"),
      Math.max(sentence.durationSeconds * 1000 + 150, 250)
    );
  }

  async function prepareVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl || trimmedUrl.length > 500 || !supportedYouTubeUrl.test(trimmedUrl)) {
      setError("Enter a valid HTTPS YouTube video link.");
      return;
    }

    setError("");
    setIsPreparing(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);

    try {
      const response = await http.post<ApiResponse<ShadowingResult>, {
        url: string;
        language: string;
        maxWordsPerSentence: number;
      }>("/api/shadowing/prepare", {
        url: trimmedUrl,
        language: "en",
        maxWordsPerSentence: Number(maxWords),
      });
      setResult(response.data);
      setCurrentIndex(0);
    } catch (requestError) {
      setResult(null);
      setError(errorMessage(requestError));
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <header>
        <Text as="div" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          YouTube shadowing
        </Text>
        <Text className="mt-2 max-w-2xl text-muted-foreground" weight="semibold">
          Listen to short caption segments, repeat them aloud, and move at your own pace.
        </Text>
      </header>

      <Card className="rounded-3xl [--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold">Prepare a video</CardTitle>
          <CardDescription>Choose a YouTube video that has captions available.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form onSubmit={prepareVideo} className="gap-4">
            <FormField>
              <FormLabel htmlFor="shadowing-url">YouTube URL</FormLabel>
              <Input
                id="shadowing-url"
                type="url"
                inputMode="url"
                maxLength={500}
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  if (error) setError("");
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-10"
                aria-invalid={Boolean(error)}
              />
              <FormDescription>Standard videos, Shorts, Live, and youtu.be links are supported.</FormDescription>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <FormField>
                <FormLabel>Caption language</FormLabel>
                <div className="flex h-10 items-center rounded-lg border border-input bg-muted/40 px-3 text-sm font-medium">
                  English
                </div>
              </FormField>

              <FormField>
                <FormLabel>Words per segment</FormLabel>
                <Select value={maxWords} onValueChange={(value) => value && setMaxWords(value)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>{maxWords} words</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[8, 10, 12, 15, 20].map((count) => (
                      <SelectItem key={count} value={String(count)}>{count} words</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <Button type="submit" size="lg" disabled={isPreparing}>
                <Play weight="fill" />
                {isPreparing ? "Preparing…" : "Prepare video"}
              </Button>
            </div>
            {error ? <FormMessage variant="error" role="alert">{error}</FormMessage> : null}
          </Form>
        </CardContent>
      </Card>

      {isPreparing ? (
        <Card className="rounded-3xl">
          <LoadingState title="Preparing your practice" description="Loading captions and creating short segments." />
        </Card>
      ) : null}

      {!isPreparing && error && !result ? (
        <Alert variant="destructive" className="rounded-2xl p-4">
          <WarningCircle />
          <AlertTitle>Couldn’t prepare this video</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isPreparing && result && currentSentence ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <Card className="rounded-3xl [--card-spacing:--spacing(4)]">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold tracking-normal">{result.title}</CardTitle>
              <CardDescription>{result.sentenceCount} practice segments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video overflow-hidden rounded-2xl bg-foreground">
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${result.videoId}?enablejsapi=1&playsinline=1`}
                  title={result.title}
                  className="size-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>

          <Card className="justify-between rounded-3xl [--card-spacing:--spacing(5)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardDescription className="font-bold text-brand-700">
                  {currentIndex + 1} of {result.sentenceCount}
                </CardDescription>
                <span className="text-xs font-bold text-muted-foreground">
                  {formatTime(currentSentence.startSeconds)}–{formatTime(currentSentence.endSeconds)}
                </span>
              </div>
              <CardTitle className="mt-5 text-xl font-extrabold leading-relaxed tracking-normal sm:text-2xl">
                {currentSentence.text}
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-3">
              <Button type="button" size="lg" onClick={() => playSentence(currentIndex)}>
                <Icon icon={ArrowCounterClockwise} />
                Replay segment
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentIndex === 0}
                  onClick={() => playSentence(currentIndex - 1)}
                >
                  <Icon icon={CaretLeft} />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentIndex === result.sentences.length - 1}
                  onClick={() => playSentence(currentIndex + 1)}
                >
                  Next
                  <Icon icon={CaretRight} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
