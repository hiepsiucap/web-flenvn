"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowCounterClockwise,
  CaretLeft,
  CaretRight,
  Cards,
  SpeakerHigh,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import type { Book, Flashcard } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    Boolean(target.closest('[role="combobox"]'))
  );
}

export function FlipFlashcardReviewer({
  books,
  flashcards,
  selectedBook,
}: {
  books: Book[];
  flashcards: Flashcard[];
  selectedBook: Book | null;
}) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPending, startTransition] = useTransition();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const currentCard = flashcards[index];
  const progress = flashcards.length
    ? Math.round(((index + 1) / flashcards.length) * 100)
    : 0;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        setIndex(index - 1);
        setFlipped(false);
        return;
      }

      if (event.key === "ArrowRight" && index < flashcards.length - 1) {
        event.preventDefault();
        setIndex(index + 1);
        setFlipped(false);
        return;
      }

      if (event.key === " " || event.key === "Enter") {
        const target = event.target;
        const isAnotherControl =
          target instanceof HTMLElement &&
          Boolean(target.closest('button:not([data-slot="flip-card"])'));

        if (isAnotherControl) return;

        event.preventDefault();
        setFlipped((value) => !value);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flashcards.length, index]);

  function changeBook(bookId: string | null) {
    if (!bookId || bookId === selectedBook?.id) return;

    startTransition(() => {
      router.push(`/flip-flashcards?bookId=${encodeURIComponent(bookId)}`);
    });
  }

  function goToCard(nextIndex: number) {
    setIndex(nextIndex);
    setFlipped(false);
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
  }

  function playAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  if (!books.length) {
    return (
      <EmptyState
        title="No books yet"
        description="Create a book and add flashcards before using flip-card study."
        action={<CreateBookDialog />}
      />
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Text as="div" size="2xl" weight="semibold">
            Flip cards
          </Text>
          <Text className="mt-2" size="sm" tone="muted">
            Study at your own pace. Flip each card to reveal its meaning.
          </Text>
        </div>

        <div className="w-full sm:w-64">
          <label className="mb-1.5 block text-xs text-muted-foreground">
            Book
          </label>
          <Select value={selectedBook?.id ?? ""} onValueChange={changeBook}>
            <SelectTrigger className="h-10 w-full rounded-xl" disabled={isPending}>
              <SelectValue>{selectedBook?.title}</SelectValue>
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
      </section>

      {!currentCard ? (
        <EmptyState
          variant="panel"
          title={`No flashcards in ${selectedBook?.title}`}
          description="Add flashcards to this book, then return here to study them."
          action={selectedBook ? (
            <Button render={<Link href={`/books/${encodeURIComponent(selectedBook.id)}`} />} nativeButton={false}>
              Open book
            </Button>
          ) : null}
        />
      ) : (
        <>
          <section className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant="secondary" className="rounded-xl">
                  <Icon icon={Cards} />
                  {index + 1} / {flashcards.length}
                </Badge>
                <Text className="truncate" size="sm" weight="semibold">
                  {selectedBook?.title}
                </Text>
              </div>
              <Text size="xs" tone="muted">
                {progress}%
              </Text>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>

          <div className="grid items-center gap-4 sm:grid-cols-[auto_minmax(0,32rem)_auto] sm:justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="hidden rounded-full sm:inline-flex"
              disabled={index === 0}
              aria-label="Previous flashcard"
              onClick={() => goToCard(index - 1)}
            >
              <Icon icon={CaretLeft} />
            </Button>

            <div className="relative">
              {currentCard.audioUrl ? (
                <>
                  <audio
                    key={currentCard.id}
                    ref={audioRef}
                    src={currentCard.audioUrl}
                    autoPlay
                    preload="auto"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-4 top-4 z-20 rounded-full bg-background/90 shadow-sm"
                    aria-label={`Play pronunciation for ${currentCard.word}`}
                    title="Play pronunciation"
                    onClick={playAudio}
                  >
                    <Icon icon={SpeakerHigh} />
                  </Button>
                </>
              ) : null}

              <button
                type="button"
                data-slot="flip-card"
                className="group grid min-h-[440px] w-full rounded-2xl text-left outline-none [perspective:1200px] focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`Flip flashcard to show ${flipped ? "front" : "back"}`}
                aria-pressed={flipped}
                onClick={() => setFlipped((value) => !value)}
              >
                <div
                  className={cn(
                    "relative size-full min-h-[440px] rounded-2xl transition-transform duration-500 [transform-style:preserve-3d]",
                    flipped && "[transform:rotateY(180deg)]"
                  )}
                >
                <div className="absolute inset-0 grid overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md shadow-brand-800/10 [backface-visibility:hidden]">
                  <div className="flex items-start pr-12">
                    <Badge variant="secondary" className="rounded-xl">
                      Front
                    </Badge>
                  </div>

                  <div className="grid place-items-center text-center">
                    <div className="grid justify-items-center gap-4">
                      {currentCard.imageUrl ? (
                        <div
                          className="h-40 w-56 max-w-full rounded-2xl border border-border bg-secondary bg-cover bg-center"
                          style={{ backgroundImage: `url(${currentCard.imageUrl})` }}
                          aria-label={`${currentCard.word} image`}
                          role="img"
                        />
                      ) : null}
                      <Text as="div" className="text-4xl" weight="semibold" tone="primary">
                        {currentCard.word}
                      </Text>
                      {currentCard.pronunciation ? (
                        <Text size="sm" tone="muted">
                          {currentCard.pronunciation}
                        </Text>
                      ) : null}
                      {currentCard.partOfSpeech ? (
                        <Text className="uppercase tracking-wide" size="xs" tone="muted">
                          {currentCard.partOfSpeech}
                        </Text>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 grid overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md shadow-brand-800/10 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="flex items-start pr-12">
                    <Badge variant="outline" className="rounded-xl">
                      Back
                    </Badge>
                  </div>

                  <div className="grid max-h-full content-center gap-4 overflow-y-auto pr-1">
                    <div>
                      <Text className="uppercase tracking-wide" size="xs" weight="semibold" tone="muted">
                        Definition
                      </Text>
                      <Text className="mt-1 leading-7" size="lg" weight="semibold">
                        {currentCard.definition || "No definition yet"}
                      </Text>
                    </div>
                    <div>
                      <Text className="uppercase tracking-wide" size="xs" weight="semibold" tone="muted">
                        Translation
                      </Text>
                      <Text className="mt-1" size="2xl" weight="semibold">
                        {currentCard.translation || "No translation yet"}
                      </Text>
                    </div>
                    {currentCard.example ? (
                      <div className="rounded-xl border border-border bg-background p-3">
                        <Text className="uppercase tracking-wide" size="xs" weight="semibold" tone="muted">
                          Example
                        </Text>
                        <Text className="mt-1 leading-6" size="sm">
                          {currentCard.example}
                        </Text>
                        {currentCard.exampleTranslation ? (
                          <Text className="mt-2 leading-5" size="xs" tone="muted">
                            {currentCard.exampleTranslation}
                          </Text>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                </div>
              </button>
            </div>

            <Button
              type="button"
              size="icon-lg"
              className="hidden rounded-full sm:inline-flex"
              disabled={index === flashcards.length - 1}
              aria-label="Next flashcard"
              onClick={() => goToCard(index + 1)}
            >
              <Icon icon={CaretRight} />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={index === 0 && !flipped}
                onClick={restart}
              >
                <Icon icon={ArrowCounterClockwise} />
                Start over
              </Button>
            </div>

            <div className="flex items-center gap-2 sm:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={index === 0}
                onClick={() => goToCard(index - 1)}
              >
                <Icon icon={CaretLeft} />
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                disabled={index === flashcards.length - 1}
                onClick={() => goToCard(index + 1)}
              >
                Next
                <Icon icon={CaretRight} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
