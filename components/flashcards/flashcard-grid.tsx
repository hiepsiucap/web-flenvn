"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  FloppyDisk as Save,
  PencilSimple as Edit3,
  SpeakerHigh as Volume2,
  Spinner as Loader2,
  Trash as Trash2,
  Sparkle as Sparkles,
  MagicWand as Wand2,
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
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
import { FlashcardAudioField } from "@/components/flashcards/flashcard-audio-field";
import { LabelingStatus } from "@/components/flashcards/labels/labeling-status";
import { useFlashcardLabelPolling } from "@/components/flashcards/labels/use-flashcard-label-polling";
import { FlashcardLabelEditor } from "@/components/flashcards/labels/flashcard-label-editor";
import { LearningStatusBadge } from "@/components/flashcards/learning-status-badge";
import type { ApiEnvelope, ApiErrorResponse } from "@/lib/auth-types";
import type { Book, Flashcard, LabelCatalogItem } from "@/lib/dashboard-data";
import {
  buildFlashcardUpdatePayload,
  DEFAULT_FLASHCARD_IMAGE_URL,
  PARTS_OF_SPEECH,
  validateFlashcardEdit,
  type ImageChoice,
} from "@/lib/flashcard-edit";

type PresignResponse = { uploadUrl: string; fileUrl: string; headers?: Record<string, string> };
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageBytes = 5 * 1024 * 1024;

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
  books,
}: {
  flashcards: Flashcard[];
  labels: LabelCatalogItem[];
  books: Book[];
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
  const [exampleTranslation, setExampleTranslation] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageChoice, setImageChoice] = useState<ImageChoice>("current");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [suggestedImages, setSuggestedImages] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isCorrectingExample, setIsCorrectingExample] = useState(false);
  const [audioBusy, setAudioBusy] = useState<string | null>(null);
  const [keepExistingAssets, setKeepExistingAssets] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  useEffect(() => {
    if (imagePreview) return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  function resetDraft(card: Flashcard) {
    setWord(card.word);
    setPartOfSpeech(card.partOfSpeech ?? "");
    setPronunciation(card.pronunciation ?? "");
    setTranslation(card.translation ?? "");
    setDefinition(card.definition ?? "");
    setExample(card.example ?? "");
    setExampleAudioUrl(card.exampleAudioUrl ?? "");
    setExampleTranslation(card.exampleTranslation ?? "");
    setAudioUrl(card.audioUrl ?? "");
    setImageUrl(card.imageUrl ?? "");
    setImageChoice("current");
    setImageFile(null);
    setImagePreview("");
    setSuggestedImages([]);
    setKeepExistingAssets(false);
    setFieldErrors({});
    setAudioBusy(null);
  }

  function openCard(card: Flashcard) {
    resetDraft(card);
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

    const draft = { word, partOfSpeech, pronunciation, translation, definition, example, exampleAudioUrl, exampleTranslation, audioUrl };
    const errors = validateFlashcardEdit(draft);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    if (imageChoice === "upload" && imageFile && (!allowedImageTypes.includes(imageFile.type) || imageFile.size > maxImageBytes)) {
      setFieldErrors({ image: "Choose a JPEG, PNG, or WebP image up to 5 MB." });
      return;
    }
    setFieldErrors({});
    setIsSaving(true);

    try {
      let selectedImageUrl = imageChoice === "suggested" ? imageUrl : null;
      if (imageChoice === "upload" && imageFile) {
        const result = await http.post<PresignResponse | { data: PresignResponse }>(
          "/api/uploads/presign-image",
          { contentType: imageFile.type, fileName: imageFile.name, folder: "flashcard-images" }
        );
        const presign = "data" in result ? result.data : result;
        const response = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": imageFile.type, ...presign.headers },
          body: imageFile,
        });
        if (!response.ok) throw new Error("Unable to upload image");
        selectedImageUrl = presign.fileUrl;
      }
      await http.put(`/api/flashcards/${selectedCard.id}`, buildFlashcardUpdatePayload(
        selectedCard, draft, imageChoice, selectedImageUrl, keepExistingAssets
      ));

      toast.success("Flashcard updated");
      setSelectedCard(null);
      notifyClientDataChanged();
    } catch (error) {
      toast.error(error instanceof Error && !(error instanceof HttpError) ? error.message : getErrorMessage(error, "Unable to update flashcard"));
    } finally {
      setIsSaving(false);
    }
  }

  async function suggestImages() {
    if (!word.trim()) {
      setFieldErrors({ word: "Enter a word before finding images." });
      return;
    }
    setIsSuggesting(true);
    try {
      const response = await http.get<{ data: { images?: { url?: string }[] } }>("/api/words/suggest", {
        query: { word: word.trim(), targetLanguage: "vi", imageLimit: 6 },
      });
      const images = response.data.images?.map((item) => item.url).filter((url): url is string => Boolean(url)) ?? [];
      setSuggestedImages(images);
      if (!images.length) toast.info("No images found for this word");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to suggest images"));
    } finally {
      setIsSuggesting(false);
    }
  }

  async function correctExample() {
    if (!example.trim()) return;
    setIsCorrectingExample(true);
    try {
      const response = await http.post<{
        correctedText?: string; correction?: string; text?: string;
        data?: { correctedText?: string; correction?: string; text?: string };
      }>("/api/words/correct", { text: example, language: "en-US" });
      const corrected = response.data?.correctedText ?? response.data?.correction ?? response.data?.text
        ?? response.correctedText ?? response.correction ?? response.text;
      if (corrected) setExample(corrected);
      else toast.info("No correction needed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to correct example"));
    } finally {
      setIsCorrectingExample(false);
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
                className="h-32 bg-secondary bg-cover bg-center transition-transform duration-300 group-hover:scale-105 sm:aspect-[5/3] sm:h-auto"
                style={{ backgroundImage: `url(${card.imageUrl})` }}
              />
            ) : (
              <div className="grid h-32 place-items-center bg-secondary text-primary sm:aspect-[5/3] sm:h-auto">
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
          if (!open && !isSaving && !audioBusy) {
            setSelectedCard(null);
            setIsEditing(false);
          }
        }}
      >
        <ModalContent className="sm:max-w-4xl">
          <ModalHeader>
            <ModalTitle>{isEditing ? "Edit flashcard" : "Flashcard detail"}</ModalTitle>
            <ModalDescription>{isEditing ? "Update the text and choose images or audio for this card." : "View, update, or delete this flashcard."}</ModalDescription>
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
                  <Text className="mt-1" size="xs" tone="muted">
                    Book: {books.find((book) => book.id === selectedCard.bookId)?.title ?? "No book"}
                  </Text>
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
                    {selectedCard.exampleTranslation ? <Text className="mt-1" size="sm" tone="muted">{selectedCard.exampleTranslation}</Text> : null}
                  </div>
                ) : null}
              </div>

            </div>
          ) : null}

          {selectedCard && isEditing ? (
            <Form id="update-flashcard-form" className="gap-6" onSubmit={handleUpdate}>
              <section className="grid gap-4" aria-labelledby="edit-word-heading">
                <div>
                  <h3 id="edit-word-heading" className="text-sm font-semibold">Word and meaning</h3>
                  <p className="text-xs text-muted-foreground">Edit the word and its definition.</p>
                </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField>
                  <FormLabel htmlFor="detail-word">Word</FormLabel>
                  <FormInput
                    id="detail-word"
                    className="h-10"
                    value={word}
                    onChange={(event) => setWord(event.target.value)}
                    required
                    maxLength={100}
                    aria-invalid={Boolean(fieldErrors.word)}
                  />
                  {fieldErrors.word ? <p className="text-sm text-destructive" role="alert">{fieldErrors.word}</p> : null}
                </FormField>
                <FormField>
                  <FormLabel htmlFor="detail-part">Part of speech</FormLabel>
                  <Select value={partOfSpeech || null} onValueChange={(value) => setPartOfSpeech(value ?? "")}>
                    <SelectTrigger id="detail-part" className="h-10 w-full">
                      {partOfSpeech ? partOfSpeech.charAt(0).toUpperCase() + partOfSpeech.slice(1) : "Choose a part of speech"}
                    </SelectTrigger>
                    <SelectContent>
                      {PARTS_OF_SPEECH.map((part) => <SelectItem key={part} value={part}>{part.charAt(0).toUpperCase() + part.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {partOfSpeech ? <Button type="button" variant="ghost" size="sm" onClick={() => setPartOfSpeech("")}>Clear</Button> : null}
                  {fieldErrors.partOfSpeech ? <p className="text-sm text-destructive" role="alert">{fieldErrors.partOfSpeech}</p> : null}
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
              </section>

              <section className="grid gap-4 border-t border-border pt-5" aria-labelledby="edit-example-heading">
                <h3 id="edit-example-heading" className="text-sm font-semibold">Example</h3>
              <FormField>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel htmlFor="detail-example">Example</FormLabel>
                  <Button type="button" variant="outline" size="sm" disabled={isCorrectingExample || isSaving || !example.trim()} onClick={() => void correctExample()}>
                    {isCorrectingExample ? <Icon icon={Loader2} className="animate-spin" /> : <Icon icon={Wand2} />} Correct
                  </Button>
                </div>
                <FormTextarea
                  id="detail-example"
                  value={example}
                  onChange={(event) => setExample(event.target.value)}
                />
              </FormField>

              <FormField>
                <FormLabel htmlFor="detail-example-translation">Example translation</FormLabel>
                <FormTextarea id="detail-example-translation" value={exampleTranslation} onChange={(event) => setExampleTranslation(event.target.value)} />
              </FormField>
              </section>

              <section className="grid gap-5 border-t border-border pt-5" aria-labelledby="edit-audio-heading">
                <h3 id="edit-audio-heading" className="text-sm font-semibold">Audio</h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <FlashcardAudioField id="detail-audio" label="Word pronunciation" text={word} value={audioUrl} onChange={setAudioUrl} busy={audioBusy} onBusyChange={setAudioBusy} disabled={isSaving} error={fieldErrors.audioUrl} />
                  <FlashcardAudioField id="detail-example-audio" label="Example sentence" text={example} value={exampleAudioUrl} onChange={setExampleAudioUrl} busy={audioBusy} onBusyChange={setAudioBusy} disabled={isSaving} error={fieldErrors.exampleAudioUrl} />
                </div>
              </section>

              <section className="grid gap-4 border-t border-border pt-5" aria-labelledby="edit-image-heading">
                <h3 id="edit-image-heading" className="text-sm font-semibold">Image</h3>
                {(imageChoice === "upload" ? imagePreview : imageChoice === "default" ? DEFAULT_FLASHCARD_IMAGE_URL : imageUrl) ? (
                  <div className="h-28 w-40 rounded-xl bg-secondary bg-cover bg-center" role="img" aria-label="Selected flashcard image"
                    style={{ backgroundImage: `url(${imageChoice === "upload" ? imagePreview : imageChoice === "default" ? DEFAULT_FLASHCARD_IMAGE_URL : imageUrl})` }} />
                ) : null}
              <FormField>
                <FormLabel htmlFor="detail-image">Upload image</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {imageChoice !== "current" ? <Button type="button" variant="outline" disabled={isSaving} onClick={() => {
                    setImageChoice("current"); setImageUrl(selectedCard.imageUrl ?? ""); setImageFile(null); setImagePreview("");
                  }}>Keep current image</Button> : null}
                  <Button type="button" variant="outline" disabled={isSuggesting || isSaving} onClick={() => void suggestImages()}>
                    {isSuggesting ? <Icon icon={Loader2} className="animate-spin" /> : <Icon icon={Sparkles} />} Suggest images
                  </Button>
                  <Button type="button" variant="outline" disabled={isSaving} onClick={() => { setImageChoice("default"); setImageFile(null); setImagePreview(""); }}>
                    Use default image
                  </Button>
                </div>
                <FormInput id="detail-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={isSaving} onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setImageFile(file);
                  setImagePreview(file ? URL.createObjectURL(file) : "");
                  if (file) setImageChoice("upload");
                  event.currentTarget.value = "";
                }} />
                <p className="text-xs text-muted-foreground">Upload JPEG, PNG, or WebP, up to 5 MB.</p>
                {fieldErrors.image ? <p className="text-sm text-destructive" role="alert">{fieldErrors.image}</p> : null}
                {suggestedImages.length ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Suggested images">
                    {suggestedImages.map((url, index) => (
                      <button key={`${url}-${index}`} type="button" aria-label={`Choose suggested image ${index + 1}`} aria-pressed={imageChoice === "suggested" && imageUrl === url}
                        className="aspect-square overflow-hidden rounded-lg border border-border bg-secondary bg-cover bg-center aria-pressed:ring-2 aria-pressed:ring-primary"
                        style={{ backgroundImage: `url(${url})` }} onClick={() => { setImageChoice("suggested"); setImageUrl(url); setImageFile(null); setImagePreview(""); }} />
                    ))}
                  </div>
                ) : null}
              </FormField>
              </section>

              {word.trim() !== selectedCard.word ? (
                <div className="grid gap-2 border-t border-border pt-5">
                  <p className="text-sm font-medium">Changing the word</p>
                  <p className="text-xs text-muted-foreground">The current image and word audio will be cleared unless you choose replacements or keep them below.</p>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={keepExistingAssets} onChange={(event) => setKeepExistingAssets(event.target.checked)} />
                    Keep the current image and pronunciation audio
                  </label>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">The book cannot be changed here. Edit labels in the detail view; learning progress updates through reviews.</p>

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
                    disabled={isDeleting || isSaving || Boolean(audioBusy)}
                    onClick={() => { resetDraft(selectedCard); setIsEditing(false); }}
                  >
                    Cancel
                  </Button>
                  <ModalActionButton
                    form="update-flashcard-form"
                    disabled={isSaving || isDeleting || isSuggesting || isCorrectingExample || Boolean(audioBusy)}
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
