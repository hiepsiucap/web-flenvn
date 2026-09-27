import type { Flashcard } from "./dashboard-data";

export const DEFAULT_FLASHCARD_IMAGE_URL =
  "https://flenvn.s3.ap-southeast-1.amazonaws.com/images/logo.png";

export const PARTS_OF_SPEECH = [
  "noun", "verb", "adjective", "adverb", "pronoun", "preposition",
  "conjunction", "interjection", "determiner", "phrase",
] as const;

export type ImageChoice = "current" | "suggested" | "upload" | "default";

export type FlashcardEditDraft = {
  word: string;
  partOfSpeech: string;
  pronunciation: string;
  definition: string;
  translation: string;
  audioUrl: string;
  example: string;
  exampleAudioUrl: string;
  exampleTranslation: string;
};

export function validateFlashcardEdit(draft: FlashcardEditDraft) {
  const errors: Partial<Record<keyof FlashcardEditDraft, string>> = {};
  const word = draft.word.trim();
  if (!word) errors.word = "Enter a word.";
  else if (word.length > 100) errors.word = "Use 100 characters or fewer.";

  if (draft.partOfSpeech && !PARTS_OF_SPEECH.includes(draft.partOfSpeech as typeof PARTS_OF_SPEECH[number])) {
    errors.partOfSpeech = "Choose a valid part of speech.";
  }

  for (const key of ["audioUrl", "exampleAudioUrl"] as const) {
    const value = draft[key].trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") errors[key] = "Enter an HTTP or HTTPS URL.";
    } catch {
      errors[key] = "Enter a valid URL.";
    }
  }
  return errors;
}

export function buildFlashcardUpdatePayload(
  original: Flashcard,
  draft: FlashcardEditDraft,
  imageChoice: ImageChoice,
  selectedImageUrl: string | null,
  keepExistingAssets: boolean,
) {
  const word = draft.word.trim();
  const wordChanged = word !== original.word;
  const payload: Record<string, string | null> = { word };

  const fields = [
    "partOfSpeech", "pronunciation", "definition", "translation",
    "audioUrl", "example", "exampleAudioUrl", "exampleTranslation",
  ] as const;
  for (const field of fields) {
    const value = draft[field].trim();
    if (value !== (original[field] ?? "")) {
      payload[field] = value || null;
    }
  }

  if (imageChoice === "default") payload.imageUrl = DEFAULT_FLASHCARD_IMAGE_URL;
  else if (imageChoice !== "current" && selectedImageUrl) payload.imageUrl = selectedImageUrl;
  else if (wordChanged && keepExistingAssets && original.imageUrl) payload.imageUrl = original.imageUrl;

  if (wordChanged && keepExistingAssets && payload.audioUrl === undefined && original.audioUrl) {
    payload.audioUrl = original.audioUrl;
  }
  return payload;
}
