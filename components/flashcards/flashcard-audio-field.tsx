"use client";

import { Spinner, Sparkle, Trash } from "@phosphor-icons/react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { FormInput, FormLabel } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { validateFlashcardAudioFile } from "@/lib/flashcard-audio";
import { HttpError, http } from "@/lib/http";

type AudioResult = { url: string };
type UploadResult = { fileUrl: string };

function unwrap<T>(result: T | { data: T }): T {
  return "data" in (result as object) ? (result as { data: T }).data : result as T;
}

function errorMessage(error: unknown) {
  if (error instanceof HttpError) {
    const message = (error.data as { message?: string | string[] } | null)?.message;
    return Array.isArray(message) ? message.join(" ") : message ?? "Unable to update audio";
  }
  return error instanceof Error ? error.message : "Unable to update audio";
}

export function FlashcardAudioField({
  id,
  label,
  text,
  value,
  onChange,
  busy,
  onBusyChange,
  disabled,
  error,
}: {
  id: string;
  label: string;
  text: string;
  value: string;
  onChange: (url: string) => void;
  busy: string | null;
  onBusyChange: (id: string | null) => void;
  disabled: boolean;
  error?: string;
}) {
  const isBusy = busy === id;
  const controlsDisabled = disabled || busy !== null;

  async function suggest() {
    const source = text.trim();
    if (!source) return;
    onBusyChange(id);
    try {
      const result = await http.post<AudioResult | { data: AudioResult }>(
        "/api/flashcards/audio/suggest",
        { text: source },
      );
      onChange(unwrap(result).url);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      onBusyChange(null);
    }
  }

  async function upload(file: File) {
    const error = validateFlashcardAudioFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    onBusyChange(id);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await http.post<UploadResult | { data: UploadResult }>(
        "/api/uploads/audio",
        form,
      );
      onChange(unwrap(result).fileUrl);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      onBusyChange(null);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FormLabel htmlFor={id}>{label}</FormLabel>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={controlsDisabled || !text.trim() || text.trim().length > 1000} onClick={() => void suggest()}>
            {isBusy ? <Icon icon={Spinner} className="animate-spin" /> : <Icon icon={Sparkle} />}
            Suggest
          </Button>
          {value ? <Button type="button" size="sm" variant="ghost" disabled={controlsDisabled} onClick={() => onChange("")}>
            <Icon icon={Trash} /> Remove
          </Button> : null}
        </div>
      </div>
      <FormInput id={id} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,audio/webm" disabled={controlsDisabled} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void upload(file);
        event.currentTarget.value = "";
      }} />
      <p className="text-xs text-muted-foreground">Upload MP3, M4A, WAV, or WebM up to 5 MB, or suggest audio from the text above.</p>
      {text.trim().length > 1000 ? <p className="text-xs text-destructive">Audio suggestions support up to 1,000 characters.</p> : null}
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
      {value ? <audio controls preload="none" src={value} className="w-full" aria-label={`${label} preview`} /> : <p className="text-sm text-muted-foreground">No audio selected.</p>}
    </div>
  );
}
