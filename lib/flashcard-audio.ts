export const FLASHCARD_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
];

export const FLASHCARD_AUDIO_MAX_BYTES = 5 * 1024 * 1024;

export function validateFlashcardAudioFile(file: Pick<File, "type" | "size">) {
  if (!FLASHCARD_AUDIO_TYPES.includes(file.type)) {
    return "Choose an MP3, M4A, WAV, or WebM audio file.";
  }
  if (file.size > FLASHCARD_AUDIO_MAX_BYTES) {
    return "Audio must be 5 MB or smaller.";
  }
  return null;
}
