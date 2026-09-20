"use client";

import { FormEvent, useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

function getYouTubeVideoId(value: string) {
  const input = value.trim();

  if (YOUTUBE_ID_PATTERN.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId && YOUTUBE_ID_PATTERN.test(videoId) ? videoId : null;
    }

    if (
      hostname !== "youtube.com" &&
      hostname !== "m.youtube.com" &&
      hostname !== "music.youtube.com" &&
      hostname !== "youtube-nocookie.com"
    ) {
      return null;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    const videoId =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : ["embed", "shorts", "live"].includes(pathParts[0])
          ? pathParts[1]
          : null;

    return videoId && YOUTUBE_ID_PATTERN.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export function YouTubeEmbedForm() {
  const playerRef = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextVideoId = getYouTubeVideoId(url);

    if (!nextVideoId) {
      setVideoId(null);
      setError("Enter a valid YouTube video link.");
      return;
    }

    setError("");
    setVideoId(nextVideoId);
  }

  function pauseVideo() {
    playerRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
      "https://www.youtube-nocookie.com"
    );
  }

  function continueVideo() {
    playerRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "https://www.youtube-nocookie.com"
    );
  }

  return (
    <div className="grid gap-8">
      <form onSubmit={handleSubmit} className="grid gap-3" noValidate>
        <Label htmlFor="youtube-url">YouTube video link</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="youtube-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) setError("");
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            aria-describedby={error ? "youtube-url-error" : "youtube-url-help"}
            aria-invalid={Boolean(error)}
            className="h-11 px-4"
          />
          <Button type="submit" size="lg" className="sm:min-w-36">
            <Play weight="fill" />
            Embed video
          </Button>
        </div>
        {error ? (
          <p id="youtube-url-error" role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : (
          <p id="youtube-url-help" className="text-sm text-muted-foreground">
            Works with standard YouTube, Shorts, Live, and youtu.be links.
          </p>
        )}
      </form>

      {videoId ? (
        <div className="grid gap-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="aspect-video w-full">
              <iframe
                ref={playerRef}
                key={videoId}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1`}
                title="Embedded YouTube video"
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={pauseVideo}>
              <Pause weight="fill" />
              Pause video
            </Button>
            <Button type="button" onClick={continueVideo}>
              <Play weight="fill" />
              Continue video
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid aspect-video place-items-center rounded-2xl border border-border bg-muted/40 px-6 text-center">
          <div>
            <Play className="mx-auto size-10 text-primary" weight="duotone" aria-hidden="true" />
            <p className="mt-3 font-semibold text-foreground">Your video will appear here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste a YouTube link above to start watching.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
