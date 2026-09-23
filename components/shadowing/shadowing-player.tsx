"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CaretLeft, CaretRight, GlobeHemisphereWest, Info, Lightbulb, LinkSimple, Play, TextAlignLeft, WarningCircle, Waveform } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import mascot from "@/img/moscot.png";
import { HttpError, http } from "@/lib/http";

type Sentence = { id: number; text: string; startSeconds: number; endSeconds: number; durationSeconds: number };
type Result = { videoId: string; url: string; title: string; language: string; sentenceCount: number; sentences: Sentence[] };
type RecentVideo = Pick<Result, "videoId" | "url" | "title" | "language"> & { maxWords: string; openedAt: string };
type ApiResponse<T> = { success: boolean; data: T };

const youtubeUrl = /^https:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)[A-Za-z0-9_-]{11}(?:[?&#/].*)?$/i;
const tips = [
  "Listen carefully to the speaker's rhythm and intonation.",
  "Repeat out loud immediately after each segment.",
  "Don't just copy words — try to match the tone and emotion.",
  "Save new words to grow your vocabulary.",
];

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function recentDate(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  return days < 1 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof HttpError)) return "The video could not be loaded right now.";
  if (error.status === 400) return "Enter a valid YouTube video link.";
  if (error.status === 401) return "Sign in to use shadowing.";
  if (error.status === 404) return "This video does not have usable captions in the selected language.";
  if (error.status === 429) return "Too many requests. Wait briefly and try again.";
  return "The video could not be loaded right now.";
}

function normalizeRecentVideos(response: unknown): RecentVideo[] {
  if (!response || typeof response !== "object") return [];
  const envelope = response as Record<string, unknown>;
  const data = envelope.data ?? response;
  const items = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).items)
      ? (data as Record<string, unknown>).items as unknown[]
      : [];

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const video = item as Record<string, unknown>;
    const videoId = video.videoId ?? video.youtubeVideoId;
    const url = video.url ?? video.videoUrl ?? video.youtubeUrl;
    if (typeof videoId !== "string" || typeof url !== "string") return [];
    const words = video.maxWordsPerSentence ?? video.maxWords ?? video.wordsPerSegment ?? 12;
    const openedAt = video.lastPracticedAt ?? video.openedAt ?? video.updatedAt ?? video.createdAt;
    return [{
      videoId,
      url,
      title: typeof video.title === "string" ? video.title : "YouTube video",
      language: typeof video.language === "string" ? video.language : "en",
      maxWords: String(words),
      openedAt: typeof openedAt === "string" ? openedAt : new Date().toISOString(),
    }];
  }).slice(0, 10);
}

export function ShadowingPlayer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const practiceRef = useRef<HTMLElement>(null);
  const [url, setUrl] = useState("");
  const [maxWords, setMaxWords] = useState("12");
  const [autoPlay, setAutoPlay] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [recent, setRecent] = useState<RecentVideo[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState("");
  const currentSentence = result?.sentences[currentIndex];

  const loadRecentVideos = useCallback(async () => {
    try {
      const response = await http.get<unknown>("/api/shadowing/recent", {
        cache: "no-store",
        query: { limit: 10 },
      });
      setRecent(normalizeRecentVideos(response));
      setRecentError(false);
    } catch {
      setRecent([]);
      setRecentError(true);
    } finally {
      setIsRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    const recentTimer = window.setTimeout(() => void loadRecentVideos(), 0);
    return () => {
      window.clearTimeout(recentTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loadRecentVideos]);

  function playerCommand(func: string, args: unknown[] = []) {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "https://www.youtube-nocookie.com");
  }

  function playSentence(index: number) {
    const sentence = result?.sentences[index];
    if (!sentence) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentIndex(index);
    playerCommand("seekTo", [sentence.startSeconds, true]);
    playerCommand("playVideo");
    timerRef.current = setTimeout(() => {
      playerCommand("pauseVideo");
      if (autoPlay && index < (result?.sentences.length ?? 0) - 1) playSentence(index + 1);
    }, Math.max(sentence.durationSeconds * 1000 + 150, 250));
  }

  async function prepareVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl || trimmedUrl.length > 500 || !youtubeUrl.test(trimmedUrl)) {
      setError("Enter a valid HTTPS YouTube video link.");
      return;
    }
    setError("");
    setIsPreparing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      const response = await http.post<ApiResponse<Result>, { url: string; language: string; maxWordsPerSentence: number }>("/api/shadowing/prepare", { url: trimmedUrl, language: "en", maxWordsPerSentence: Number(maxWords) });
      setResult(response.data);
      setCurrentIndex(0);
      void loadRecentVideos();
      window.setTimeout(() => practiceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (requestError) {
      setResult(null);
      setError(getErrorMessage(requestError));
    } finally {
      setIsPreparing(false);
    }
  }

  function selectRecent(video: RecentVideo) {
    setUrl(video.url);
    setMaxWords(video.maxWords);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto grid w-full max-w-[1280px] gap-5 sm:gap-6">
      <header className="flex min-h-28 items-center justify-between overflow-hidden">
        <div className="max-w-3xl py-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">YouTube shadowing</h1>
          <Text className="mt-2 text-base text-muted-foreground sm:text-lg" weight="semibold">Listen to short caption segments, repeat them aloud, and move at your own pace.</Text>
        </div>
        <Image src={mascot} alt="FLEN penguin ready to practice" className="hidden h-32 w-auto shrink-0 object-contain sm:block lg:h-36" priority />
      </header>

      <Card className="rounded-3xl border-brand-200/80 [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader><CardTitle className="text-xl font-extrabold tracking-normal">Add a YouTube video</CardTitle></CardHeader>
        <CardContent>
          <Form onSubmit={prepareVideo} className="gap-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_218px]">
              <div className="relative">
                <Icon icon={LinkSimple} className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-brand-700" />
                <Input id="shadowing-url" type="url" inputMode="url" maxLength={500} value={url} onChange={(event) => { setUrl(event.target.value); if (error) setError(""); }} placeholder="Paste a YouTube link (e.g. https://www.youtube.com/watch?v=...)" className="h-14 rounded-2xl bg-background/40 pl-12 text-base" aria-label="YouTube video URL" aria-invalid={Boolean(error)} aria-describedby={error ? "shadowing-error" : undefined} />
              </div>
              <Button type="submit" size="lg" disabled={isPreparing} className="h-14 rounded-2xl text-base font-bold"><Play weight="fill" />{isPreparing ? "Preparing…" : "Prepare video"}</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.25fr] lg:items-end">
              <FormField>
                <FormLabel htmlFor="caption-language">Caption language</FormLabel>
                <div className="relative">
                  <Icon icon={GlobeHemisphereWest} className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-brand-700" />
                  <Select value="en" disabled><SelectTrigger id="caption-language" className="h-12 w-full rounded-xl bg-background/40 pl-12"><SelectValue>English</SelectValue></SelectTrigger></Select>
                </div>
              </FormField>
              <FormField>
                <FormLabel htmlFor="segment-size">Words per segment</FormLabel>
                <div className="relative">
                  <Icon icon={TextAlignLeft} className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-brand-700" />
                  <Select value={maxWords} onValueChange={(value) => value && setMaxWords(value)}>
                    <SelectTrigger id="segment-size" className="h-12 w-full rounded-xl bg-background/40 pl-12"><SelectValue>{maxWords === "12" ? "8–12 words" : `Up to ${maxWords} words`}</SelectValue></SelectTrigger>
                    <SelectContent><SelectItem value="8">Up to 8 words</SelectItem><SelectItem value="12">8–12 words</SelectItem><SelectItem value="15">Up to 15 words</SelectItem><SelectItem value="20">Up to 20 words</SelectItem></SelectContent>
                  </Select>
                </div>
              </FormField>
              <div className="flex min-h-12 items-center gap-3 rounded-xl px-1 md:col-span-2 lg:col-span-1">
                <Checkbox id="auto-play" checked={autoPlay} onCheckedChange={setAutoPlay} className="size-5" />
                <FormLabel htmlFor="auto-play" className="cursor-pointer text-sm font-bold">Auto-play next segment</FormLabel>
                <Icon icon={Info} className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </div>
            {error ? <FormMessage id="shadowing-error" variant="error" role="alert">{error}</FormMessage> : null}
          </Form>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-brand-200/80 [--card-spacing:--spacing(5)]">
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-lg font-extrabold tracking-normal">Recent videos</CardTitle><Text size="xs" className="text-brand-700" weight="bold">Your last 10 videos</Text></CardHeader>
          <CardContent>
            {isRecentLoading ? (
              <LoadingState title="Loading recent videos" description="Finding your latest shadowing practice." />
            ) : recent.length ? <div className="divide-y divide-border">{recent.map((video) => (
              <button key={video.videoId} type="button" onClick={() => selectRecent(video)} className="group flex w-full items-center gap-3 py-3 text-left outline-none first:pt-0 last:pb-0 focus-visible:rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50">
                <span className="relative h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-brand-100 bg-cover bg-center" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg)` }} aria-hidden="true"><span className="absolute inset-0 grid place-items-center bg-foreground/10 opacity-0 transition-opacity group-hover:opacity-100"><span className="grid size-8 place-items-center rounded-full bg-white text-primary shadow-sm"><Play weight="fill" /></span></span></span>
                <span className="min-w-0 flex-1"><Text as="span" className="block truncate font-bold">{video.title}</Text><Text as="span" size="xs" tone="muted" className="mt-1 block truncate">English · up to {video.maxWords} words · {recentDate(video.openedAt)}</Text></span>
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-brand-200 text-primary"><Play weight="fill" /></span>
              </button>
            ))}</div> : (
              <div className="flex min-h-48 flex-col items-center justify-center px-4 text-center"><span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700"><Waveform className="size-6" /></span><Text className="mt-3 font-bold">{recentError ? "Recent videos unavailable" : "No recent videos yet"}</Text><Text size="sm" tone="muted" className="mt-1 max-w-sm">{recentError ? "We couldn't load your recent videos. Please try again later." : "Prepare your first YouTube video and it will appear here for quick access."}</Text></div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-brand-200/80 [--card-spacing:--spacing(5)]">
          <CardHeader className="flex-row items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-brand-yellow-soft"><Lightbulb weight="fill" className="size-5" /></span><CardTitle className="text-lg font-extrabold tracking-normal">Tips for better shadowing</CardTitle></CardHeader>
          <CardContent><ol className="divide-y divide-border">{tips.map((tip, index) => <li key={tip} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-700">{index + 1}</span><Text size="sm" tone="muted">{tip}</Text></li>)}</ol></CardContent>
        </Card>
      </div>

      {isPreparing ? <Card className="rounded-3xl"><LoadingState title="Preparing your practice" description="Loading captions and creating short segments." /></Card> : null}
      {!isPreparing && error && !result ? <Alert variant="destructive" className="rounded-2xl p-4"><WarningCircle /><AlertTitle>Couldn’t prepare this video</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      {!isPreparing && result && currentSentence ? (
        <section ref={practiceRef} className="scroll-mt-28 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]" aria-labelledby="practice-title">
          <Card className="rounded-3xl [--card-spacing:--spacing(4)]">
            <CardHeader><CardTitle id="practice-title" className="text-lg font-extrabold tracking-normal">{result.title}</CardTitle><CardDescription>{result.sentenceCount} practice segments</CardDescription></CardHeader>
            <CardContent><div className="aspect-video overflow-hidden rounded-2xl bg-foreground"><iframe ref={iframeRef} src={`https://www.youtube-nocookie.com/embed/${result.videoId}?enablejsapi=1&playsinline=1`} title={result.title} className="size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div></CardContent>
          </Card>
          <Card className="justify-between rounded-3xl [--card-spacing:--spacing(5)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-4"><CardDescription className="font-bold text-brand-700" aria-live="polite">{currentIndex + 1} of {result.sentenceCount}</CardDescription><span className="text-xs font-bold text-muted-foreground">{formatTime(currentSentence.startSeconds)}–{formatTime(currentSentence.endSeconds)}</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-100" aria-hidden="true"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((currentIndex + 1) / result.sentenceCount) * 100}%` }} /></div>
              <CardTitle className="mt-5 text-xl font-extrabold leading-relaxed tracking-normal sm:text-2xl">{currentSentence.text}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button type="button" size="lg" onClick={() => playSentence(currentIndex)}><Icon icon={ArrowCounterClockwise} />Replay segment</Button>
              <div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" disabled={currentIndex === 0} onClick={() => playSentence(currentIndex - 1)}><Icon icon={CaretLeft} />Previous</Button><Button type="button" variant="outline" disabled={currentIndex === result.sentences.length - 1} onClick={() => playSentence(currentIndex + 1)}>Next<Icon icon={CaretRight} /></Button></div>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
