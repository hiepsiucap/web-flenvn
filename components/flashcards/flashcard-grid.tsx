"use client";

import { FormEvent, useState } from "react";
import { BookOpen, Edit3, Loader2, Save, Trash2, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HttpError, http } from "@/lib/http";
import type { ApiErrorResponse } from "@/lib/auth-types";
import type { Flashcard } from "@/lib/dashboard-data";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return data?.message || fallback;
  }

  return fallback;
}

function isValidHttpUrl(value?: string | null): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function FlashcardGrid({ flashcards }: { flashcards: Flashcard[] }) {
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [word, setWord] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [translation, setTranslation] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [exampleAudioUrl, setExampleAudioUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function openCard(card: Flashcard) {
    setWord(card.word);
    setPartOfSpeech(card.partOfSpeech ?? "");
    setPronunciation(card.pronunciation ?? "");
    setTranslation(card.translation ?? "");
    setDefinition(card.definition ?? "");
    setExample(card.example ?? "");
    setExampleAudioUrl(card.exampleAudioUrl ?? "");
    setImageUrl(card.imageUrl ?? "");
    setIsEditing(false);
    setSelectedCard(card);
  }

  function playAudio(url?: string | null) {
    if (!isValidHttpUrl(url)) {
      return;
    }

    void new Audio(url).play();
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCard) {
      return;
    }

    setIsSaving(true);

    try {
      await http.put(`/api/flashcards/${selectedCard.id}`, {
        word,
        partOfSpeech,
        pronunciation,
        translation,
        definition,
        example,
        exampleAudioUrl,
        imageUrl,
        bookId: selectedCard.bookId ?? undefined,
      });

      toast.success("Flashcard updated");
      setSelectedCard(null);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update flashcard"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedCard) {
      return;
    }

    setIsDeleting(true);

    try {
      await http.delete(`/api/flashcards/${selectedCard.id}`);
      toast.success("Flashcard deleted");
      setSelectedCard(null);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete flashcard"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {flashcards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="group overflow-hidden rounded-2xl border border-border bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md hover:shadow-brand-800/10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => openCard(card)}
          >
            {card.imageUrl ? (
              <div
                className="aspect-[5/3] bg-secondary bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundImage: `url(${card.imageUrl})` }}
              />
            ) : (
              <div className="grid aspect-[5/3] place-items-center bg-secondary text-primary">
                <BookOpen className="size-7" />
              </div>
            )}
            <div className="grid gap-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{card.word}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {card.partOfSpeech || "Flashcard"}
                    {card.pronunciation ? ` - ${card.pronunciation}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 rounded-2xl capitalize">
                  {card.status}
                </Badge>
              </div>
                  <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                    {card.definition || "No definition available."}
                  </p>
                  {isValidHttpUrl(card.exampleAudioUrl) ? (
                    <span
                      className="inline-flex size-8 items-center justify-center rounded-xl border border-border bg-background text-primary"
                      title="Example audio available"
                      aria-label="Example audio available"
                    >
                      <Volume2 className="size-4" />
                    </span>
                  ) : null}
                </div>
              </button>
        ))}
      </section>

      <Dialog
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCard(null);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Flashcard detail</DialogTitle>
            <DialogDescription>View, update, or delete this flashcard.</DialogDescription>
          </DialogHeader>

          {selectedCard && !isEditing ? (
            <div className="grid gap-4">
              <div className="flex items-start gap-4">
                {selectedCard.imageUrl ? (
                  <div
                    className="h-24 w-32 shrink-0 rounded-2xl bg-secondary bg-cover bg-center"
                    style={{ backgroundImage: `url(${selectedCard.imageUrl})` }}
                  />
                ) : (
                  <div className="grid h-24 w-32 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                    <BookOpen className="size-8" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-3xl font-semibold">{selectedCard.word}</h3>
                    <Badge variant="outline" className="rounded-2xl capitalize">
                      {selectedCard.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {selectedCard.partOfSpeech || "Flashcard"}
                      {selectedCard.pronunciation
                        ? ` - ${selectedCard.pronunciation}`
                        : ""}
                    </span>
                    {isValidHttpUrl(selectedCard.audioUrl) ? (
                      <button
                        type="button"
                        className="inline-flex size-7 items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        title="Play pronunciation audio"
                        aria-label="Play pronunciation audio"
                        onClick={() => playAudio(selectedCard.audioUrl)}
                      >
                        <Volume2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                  {selectedCard.translation ? (
                    <p className="mt-3 text-base font-medium text-primary">
                      {selectedCard.translation}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Definition
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    {selectedCard.definition || "No definition available."}
                  </p>
                </div>
                {selectedCard.example ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Example
                      </p>
                      {isValidHttpUrl(selectedCard.exampleAudioUrl) ? (
                        <button
                          type="button"
                          className="inline-flex size-7 items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          title="Play example audio"
                          aria-label="Play example audio"
                          onClick={() => playAudio(selectedCard.exampleAudioUrl)}
                        >
                          <Volume2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-foreground">
                      {selectedCard.example}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Delete
                </Button>
                <Button type="button" onClick={() => setIsEditing(true)}>
                  <Edit3 className="size-4" />
                  Update
                </Button>
              </div>
            </div>
          ) : null}

          {selectedCard && isEditing ? (
            <form className="grid gap-4" onSubmit={handleUpdate}>
              {imageUrl ? (
                <div
                  className="h-28 w-40 rounded-2xl bg-secondary bg-cover bg-center"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="detail-word">Word</Label>
                  <Input
                    id="detail-word"
                    className="h-10"
                    value={word}
                    onChange={(event) => setWord(event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="detail-part">Part of speech</Label>
                  <Input
                    id="detail-part"
                    className="h-10"
                    value={partOfSpeech}
                    onChange={(event) => setPartOfSpeech(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="detail-pronunciation">Pronunciation</Label>
                  <Input
                    id="detail-pronunciation"
                    className="h-10"
                    value={pronunciation}
                    onChange={(event) => setPronunciation(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="detail-translation">Translation</Label>
                  <Input
                    id="detail-translation"
                    className="h-10"
                    value={translation}
                    onChange={(event) => setTranslation(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="detail-definition">Definition</Label>
                <Textarea
                  id="detail-definition"
                  value={definition}
                  onChange={(event) => setDefinition(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="detail-example">Example</Label>
                <Textarea
                  id="detail-example"
                  value={example}
                  onChange={(event) => setExample(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="detail-example-audio">Example audio URL</Label>
                <Input
                  id="detail-example-audio"
                  className="h-10"
                  type="url"
                  value={exampleAudioUrl}
                  onChange={(event) => setExampleAudioUrl(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="detail-image">Image URL</Label>
                <Input
                  id="detail-image"
                  className="h-10"
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting || isSaving}
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving || isDeleting}>
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save changes
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
