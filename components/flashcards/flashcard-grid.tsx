"use client";

import { FormEvent, useCallback, useState } from "react";
import {
  BookOpen,
  FloppyDisk as Save,
  PencilSimple as Edit3,
  SpeakerHigh as Volume2,
  Spinner as Loader2,
  Trash as Trash2,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormInput,
  FormLabel,
  FormTextarea,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import {
  Modal,
  ModalActionButton,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { notifyClientDataChanged } from "@/lib/client-api";
import { HttpError, http } from "@/lib/http";
import { FlashcardLabelBadges } from "@/components/flashcards/labels/flashcard-label-badges";
import { LabelingStatus } from "@/components/flashcards/labels/labeling-status";
import { useFlashcardLabelPolling } from "@/components/flashcards/labels/use-flashcard-label-polling";
import { FlashcardLabelEditor } from "@/components/flashcards/labels/flashcard-label-editor";
import { LearningStatusBadge } from "@/components/flashcards/learning-status-badge";
import type { ApiEnvelope, ApiErrorResponse } from "@/lib/auth-types";
import type { Flashcard, LabelCatalogItem } from "@/lib/dashboard-data";

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

export function FlashcardGrid({
  flashcards,
  labels,
}: {
  flashcards: Flashcard[];
  labels: LabelCatalogItem[];
}) {
  const [displayedFlashcards, setDisplayedFlashcards] = useState(flashcards);
  const [labelCatalog, setLabelCatalog] = useState(labels);
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
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const replaceCard = useCallback((nextCard: Flashcard) => {
    setDisplayedFlashcards((cards) =>
      cards.map((card) => (card.id === nextCard.id ? nextCard : card))
    );
    setSelectedCard((card) => (card?.id === nextCard.id ? nextCard : card));
  }, []);

  const timedOutIds = useFlashcardLabelPolling(displayedFlashcards, replaceCard);

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
      notifyClientDataChanged();
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
      notifyClientDataChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete flashcard"));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRetry(card: Flashcard) {
    setRetryingId(card.id);

    try {
      const response = await http.post<ApiEnvelope<Flashcard> | Flashcard>(
        `/api/flashcards/${card.id}/labels/retry`
      );
      replaceCard("data" in response ? response.data : response);
      toast.success("Labeling restarted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to retry labeling"));
      try {
        const response = await http.get<ApiEnvelope<Flashcard> | Flashcard>(
          `/api/flashcards/${card.id}`
        );
        replaceCard("data" in response ? response.data : response);
      } catch {
        // The original retry error is the actionable error for the user.
      }
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <>
      <section className="grid w-full grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {displayedFlashcards.map((card) => (
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
                <Icon icon={BookOpen} className="size-7" />
              </div>
            )}
            <div className="grid gap-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Text className="truncate" weight="semibold">
                    {card.word}
                  </Text>
                  <Text className="truncate" size="xs" tone="muted">
                    {card.partOfSpeech || "Flashcard"}
                    {card.pronunciation ? ` - ${card.pronunciation}` : ""}
                  </Text>
                  <div className="mt-2">
                    <FlashcardLabelBadges labels={card.labels} limit={3} />
                  </div>
                </div>
                <LearningStatusBadge status={card.status} className="shrink-0 rounded-2xl" />
              </div>
                  <Text className="line-clamp-2 min-h-10 leading-5" size="sm" tone="muted">
                    {card.definition || "No definition available."}
                  </Text>
                  <LabelingStatus
                    status={card.labelingStatus}
                    timedOut={timedOutIds.has(card.id)}
                  />
                </div>
              </button>
        ))}
      </section>

      <Modal
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCard(null);
            setIsEditing(false);
          }
        }}
      >
        <ModalContent className="sm:max-w-3xl">
          <ModalHeader>
            <ModalTitle>Flashcard detail</ModalTitle>
            <ModalDescription>View, update, or delete this flashcard.</ModalDescription>
          </ModalHeader>

          <ModalBody>
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
                    <Icon icon={BookOpen} className="size-8" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Text as="div" size="3xl" weight="semibold">
                      {selectedCard.word}
                    </Text>
                    <LearningStatusBadge status={selectedCard.status} className="rounded-2xl" />
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
                        <Icon icon={Volume2} size="sm" />
                      </button>
                    ) : null}
                  </div>
                  {selectedCard.translation ? (
                    <Text className="mt-3" weight="medium" tone="primary">
                      {selectedCard.translation}
                    </Text>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <FlashcardLabelBadges labels={selectedCard.labels} />
                    <FlashcardLabelEditor
                      key={`${selectedCard.id}:${selectedCard.labels?.map((label) => label.id).join(",") ?? ""}`}
                      card={selectedCard}
                      labels={labelCatalog}
                      onCardChange={replaceCard}
                      onLabelCreated={(label) =>
                        setLabelCatalog((current) =>
                          current.some((item) => item.id === label.id)
                            ? current
                            : [...current, label]
                        )
                      }
                      onCatalogChange={setLabelCatalog}
                    />
                  </div>
                  <div className="mt-2">
                    <LabelingStatus
                      status={selectedCard.labelingStatus}
                      timedOut={timedOutIds.has(selectedCard.id)}
                      retrying={retryingId === selectedCard.id}
                      onRetry={
                        selectedCard.labelingStatus === "failed"
                          ? () => void handleRetry(selectedCard)
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-4">
                <div>
                  <Text size="xs" weight="medium" tone="muted" className="uppercase">
                    Definition
                  </Text>
                  <Text className="mt-1 leading-6" size="sm">
                    {selectedCard.definition || "No definition available."}
                  </Text>
                </div>
                {selectedCard.example ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <Text size="xs" weight="medium" tone="muted" className="uppercase">
                        Example
                      </Text>
                      {isValidHttpUrl(selectedCard.exampleAudioUrl) ? (
                        <button
                          type="button"
                          className="inline-flex size-7 items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          title="Play example audio"
                          aria-label="Play example audio"
                          onClick={() => playAudio(selectedCard.exampleAudioUrl)}
                        >
                          <Icon icon={Volume2} size="sm" />
                        </button>
                      ) : null}
                    </div>
                    <Text className="mt-1 leading-6" size="sm">
                      {selectedCard.example}
                    </Text>
                  </div>
                ) : null}
              </div>

            </div>
          ) : null}

          {selectedCard && isEditing ? (
            <Form id="update-flashcard-form" className="gap-4" onSubmit={handleUpdate}>
              {imageUrl ? (
                <div
                  className="h-28 w-40 rounded-2xl bg-secondary bg-cover bg-center"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField>
                  <FormLabel htmlFor="detail-word">Word</FormLabel>
                  <FormInput
                    id="detail-word"
                    className="h-10"
                    value={word}
                    onChange={(event) => setWord(event.target.value)}
                    required
                  />
                </FormField>
                <FormField>
                  <FormLabel htmlFor="detail-part">Part of speech</FormLabel>
                  <FormInput
                    id="detail-part"
                    className="h-10"
                    value={partOfSpeech}
                    onChange={(event) => setPartOfSpeech(event.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField>
                  <FormLabel htmlFor="detail-pronunciation">Pronunciation</FormLabel>
                  <FormInput
                    id="detail-pronunciation"
                    className="h-10"
                    value={pronunciation}
                    onChange={(event) => setPronunciation(event.target.value)}
                  />
                </FormField>
                <FormField>
                  <FormLabel htmlFor="detail-translation">Translation</FormLabel>
                  <FormInput
                    id="detail-translation"
                    className="h-10"
                    value={translation}
                    onChange={(event) => setTranslation(event.target.value)}
                  />
                </FormField>
              </div>

              <FormField>
                <FormLabel htmlFor="detail-definition">Definition</FormLabel>
                <FormTextarea
                  id="detail-definition"
                  value={definition}
                  onChange={(event) => setDefinition(event.target.value)}
                />
              </FormField>

              <FormField>
                <FormLabel htmlFor="detail-example">Example</FormLabel>
                <FormTextarea
                  id="detail-example"
                  value={example}
                  onChange={(event) => setExample(event.target.value)}
                />
              </FormField>

              <FormField>
                <FormLabel htmlFor="detail-example-audio">Example audio URL</FormLabel>
                <FormInput
                  id="detail-example-audio"
                  className="h-10"
                  type="url"
                  value={exampleAudioUrl}
                  onChange={(event) => setExampleAudioUrl(event.target.value)}
                />
              </FormField>

              <FormField>
                <FormLabel htmlFor="detail-image">Image URL</FormLabel>
                <FormInput
                  id="detail-image"
                  className="h-10"
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                />
              </FormField>

            </Form>
          ) : null}
          </ModalBody>

          {selectedCard ? (
            <ModalFooter className="sm:justify-between">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDeleting || isSaving}
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <ModalActionButton
                    form="update-flashcard-form"
                    disabled={isSaving || isDeleting}
                  >
                    {isSaving ? (
                      <Icon icon={Loader2} className="animate-spin" />
                    ) : (
                      <Icon icon={Save} />
                    )}
                    Save changes
                  </ModalActionButton>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={handleDelete}
                  >
                    {isDeleting ? (
                      <Icon icon={Loader2} className="animate-spin" />
                    ) : (
                      <Icon icon={Trash2} />
                    )}
                    Delete
                  </Button>
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    <Icon icon={Edit3} />
                    Update
                  </Button>
                </>
              )}
            </ModalFooter>
          ) : null}
        </ModalContent>
      </Modal>
    </>
  );
}
