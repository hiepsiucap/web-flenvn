"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PracticeGame } from "@/lib/practice-games";

type GameChoice = PracticeGame["type"] | "all" | "speaking" | "listening";
type PickerView = "main" | "writing" | "listening";
const wordCount = (count: number) =>
  `${count} ${count === 1 ? "word" : "words"}`;
const writingGames: {
  type: PracticeGame["type"];
  name: string;
  unavailable: string;
}[] = [
  {
    type: "definition-input",
    name: "Type the word",
    unavailable: "Needs a definition.",
  },
  {
    type: "sentence-puzzle",
    name: "Sentence puzzle",
    unavailable: "Needs a short example sentence.",
  },
  {
    type: "example-blank-quiz",
    name: "Missing word",
    unavailable: "Needs an example and four answer choices.",
  },
];

export function PracticeGamePicker({
  open,
  onOpenChange,
  counts,
  speakingCount,
  totalWords,
  loading,
  message,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: Partial<Record<PracticeGame["type"], number>>;
  totalWords: number;
  speakingCount: number;
  loading: boolean;
  message: string;
  onChoose: (type: GameChoice) => void;
}) {
  const [view, setView] = useState<PickerView>("main");
  const writingAvailable = writingGames.some(
    (game) => (counts[game.type] ?? 0) > 0,
  );
  function choose(type: GameChoice) {
    setView("main");
    onChoose(type);
  }
  const tiles = [
    {
      name: "Type the word",
      image: "definition",
      width: 256,
      height: 193,
      enabled: Boolean(counts["definition-input"]),
      caption: wordCount(counts["definition-input"] ?? 0),
      action: () => choose("definition-input"),
    },
    {
      name: "Writing",
      image: "writing",
      width: 256,
      height: 244,
      enabled: writingAvailable,
      caption: "Choose a game",
      action: () => setView("writing"),
    },
    {
      name: "Speaking",
      image: "speaking",
      width: 220,
      height: 256,
      enabled: speakingCount > 0,
      caption: speakingCount
        ? `${speakingCount} ${speakingCount === 1 ? "sentence" : "sentences"}`
        : "Needs examples",
      action: () => choose("speaking"),
    },
    {
      name: "Listening",
      image: "listening",
      width: 256,
      height: 215,
      enabled: totalWords > 0,
      caption: "Choose a game",
      action: () => setView("listening"),
    },
  ];
  const options =
    view === "writing"
      ? writingGames.map((game) => ({
          ...game,
          enabled: Boolean(counts[game.type]),
          caption: wordCount(counts[game.type] ?? 0),
          action: () => choose(game.type),
        }))
      : [
          {
            name: "Image or audio",
            enabled: Boolean(counts["media-input"]),
            caption: wordCount(counts["media-input"] ?? 0),
            unavailable: "Needs an image or audio.",
            action: () => choose("media-input"),
          },
          {
            name: "Listening challenges",
            enabled: totalWords > 0,
            caption: "Quick reply · Details · Conversations",
            unavailable: "Choose words first.",
            action: () => choose("listening"),
          },
        ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setView("main");
        onOpenChange(next);
      }}
    >
      <DialogContent
        overlayClassName="bg-white/85 supports-backdrop-filter:backdrop-blur-xl"
        className="max-h-[90dvh] gap-7 overflow-y-auto bg-transparent px-2 py-10 text-foreground shadow-none ring-0 sm:max-w-xl sm:px-6 [&_[data-slot=dialog-close]]:text-foreground [&_[data-slot=dialog-close]]:hover:bg-muted/50"
      >
        <DialogHeader className="items-center gap-2 text-center">
          <DialogTitle className="text-3xl sm:text-4xl">
            {view === "main"
              ? "Choose a game"
              : view === "writing"
                ? "Writing games"
                : "Listening games"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose one game to practice your selected words.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p role="status" className="sr-only">
            Preparing game choices…
          </p>
        ) : null}
        {view === "main" ? (
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-8 sm:gap-y-8"
            aria-label={`Game types for ${totalWords} selected words`}
          >
            {tiles.map((tile) => (
              <button
                key={tile.name}
                type="button"
                disabled={loading || !tile.enabled}
                aria-label={`Play ${tile.name}`}
                onClick={tile.action}
                className="group grid min-w-0 justify-items-center gap-2 rounded-3xl border-0 bg-transparent px-2 py-3 text-center text-foreground outline-none transition-colors enabled:hover:bg-white/60 focus-visible:bg-white/80 focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 disabled:cursor-not-allowed motion-safe:transition-transform motion-safe:enabled:hover:-translate-y-1 motion-safe:enabled:active:scale-95"
              >
                <Image
                  src={`/images/games/${tile.image}.webp`}
                  width={tile.width}
                  height={tile.height}
                  alt=""
                  sizes="(min-width: 640px) 144px, 112px"
                  className="h-28 w-full object-contain group-disabled:opacity-60 group-disabled:saturate-50 motion-safe:transition-transform motion-safe:group-hover:scale-110 sm:h-36"
                />
                <span className="text-base font-bold sm:text-lg">
                  {tile.name}
                </span>
                <span className="min-h-6 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {loading
                    ? "Loading…"
                    : tile.enabled
                      ? tile.caption
                      : tile.name === "Speaking"
                        ? "Needs examples"
                        : "Not ready"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div
            className="grid gap-3"
            aria-label={
              view === "writing"
                ? "Writing game choices"
                : "Listening game choices"
            }
          >
            {options.map((option) => (
              <Button
                key={option.name}
                variant="outline"
                disabled={loading || !option.enabled}
                title={!option.enabled ? option.unavailable : undefined}
                onClick={option.action}
                className="h-auto min-h-16 justify-between gap-3 whitespace-normal rounded-2xl border-border bg-white/70 px-5 py-4 text-left focus-visible:border-border focus-visible:ring-border focus-visible:ring-offset-2"
              >
                <span className="font-semibold">{option.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {loading
                    ? "Loading…"
                    : option.enabled
                      ? option.caption
                      : "Not ready"}
                </span>
              </Button>
            ))}
            <Button
              variant="ghost"
              onClick={() => setView("main")}
              className="focus-visible:border-border focus-visible:ring-border focus-visible:ring-offset-2"
            >
              Back to games
            </Button>
          </div>
        )}
        <div className="grid justify-items-center gap-2">
          {view === "main" ? (
            <button
              type="button"
              disabled={loading || !Object.values(counts).some(Boolean)}
              onClick={() => choose("all")}
              title="Mix typing, sentence puzzle, missing word, and image or audio games."
              className="min-h-11 rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-transform motion-safe:enabled:active:scale-95"
            >
              Play all
            </button>
          ) : null}
          <p
            role={message ? "alert" : undefined}
            className="min-h-5 text-center text-xs text-muted-foreground"
          >
            {message}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
