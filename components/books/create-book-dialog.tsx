"use client";

import { FormEvent, useId, useState } from "react";
import {
  Check,
  Plus,
  Sparkle as Sparkles,
  Spinner as Loader2,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  ModalTrigger,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { notifyClientDataChanged } from "@/lib/client-api";
import { HttpError, http } from "@/lib/http";
import type { ApiErrorResponse } from "@/lib/auth-types";
import type { Book } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type GeneratedBackground =
  | string
  | {
      url?: string;
      imageUrl?: string;
      backgroundUrl?: string;
    };

type GeneratedBackgroundResponse = {
  data?:
    | GeneratedBackground[]
    | {
        backgrounds?: GeneratedBackground[];
        images?: GeneratedBackground[];
        urls?: GeneratedBackground[];
      };
  backgrounds?: GeneratedBackground[];
  images?: GeneratedBackground[];
  urls?: GeneratedBackground[];
};

function getErrorMessage(error: unknown, fallback = "Unable to create book") {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return data?.message || fallback;
  }

  return fallback;
}

function getGeneratedBackgroundUrls(response: GeneratedBackgroundResponse) {
  const nestedData = Array.isArray(response.data) ? response.data : undefined;
  const candidates =
    nestedData ??
    (!Array.isArray(response.data) ? response.data?.backgrounds : undefined) ??
    (!Array.isArray(response.data) ? response.data?.images : undefined) ??
    (!Array.isArray(response.data) ? response.data?.urls : undefined) ??
    response.backgrounds ??
    response.images ??
    response.urls ??
    [];

  return Array.from(
    new Set(
      candidates
        .map((item) =>
          typeof item === "string"
            ? item
            : item.url ?? item.imageUrl ?? item.backgroundUrl
        )
        .filter((url): url is string => Boolean(url))
    )
  );
}

export function CreateBookDialog({
  books = [],
  defaultParentBookId,
  triggerLabel = "Create book",
  iconOnly = false,
}: {
  books?: Book[];
  defaultParentBookId?: string;
  triggerLabel?: string;
  iconOnly?: boolean;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [parentBookId, setParentBookId] = useState(defaultParentBookId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [useCoverUpload, setUseCoverUpload] = useState(false);
  const [useBookUpload, setUseBookUpload] = useState(false);
  const [coverFileName, setCoverFileName] = useState("");
  const [bookFileName, setBookFileName] = useState("");
  const [generatedBackgrounds, setGeneratedBackgrounds] = useState<string[]>([]);
  const [selectedBackground, setSelectedBackground] = useState("");
  const [isGeneratingBackgrounds, setIsGeneratingBackgrounds] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGenerateBackgrounds() {
    if (!title.trim()) {
      toast.error("Enter a book title first");
      return;
    }

    setIsGeneratingBackgrounds(true);

    try {
      const response = await http.post<GeneratedBackgroundResponse>(
        "/api/books/backgrounds/generate",
        {
          title: title.trim(),
          description: description.trim() || undefined,
          count: 3,
        }
      );
      const urls = getGeneratedBackgroundUrls(response);

      if (!urls.length) {
        toast.info("No cover images were returned");
        return;
      }

      setGeneratedBackgrounds(urls);
      setSelectedBackground(urls[0]);
      setUseCoverUpload(false);
      setCoverFileName("");
      toast.success("Book covers ready");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to generate book covers"));
    } finally {
      setIsGeneratingBackgrounds(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    if (parentBookId) formData.set("parentBookId", parentBookId);

    if (!useCoverUpload && !selectedBackground) {
      formData.delete("coverImage");
    }

    if (!useBookUpload) {
      formData.delete("file");
      formData.delete("content");
    }

    try {
      await http.post("/api/books", formData);

      toast.success("Book created");
      setOpen(false);
      setTitle("");
      setParentBookId(defaultParentBookId ?? "");
      setDescription("");
      setUseCoverUpload(false);
      setUseBookUpload(false);
      setCoverFileName("");
      setBookFileName("");
      setGeneratedBackgrounds([]);
      setSelectedBackground("");
      notifyClientDataChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setParentBookId(defaultParentBookId ?? "");
      }}
    >
      <ModalTrigger
        render={
          <Button
            className={iconOnly ? "size-10 rounded-xl" : defaultParentBookId ? "h-8 rounded-2xl" : "h-10 rounded-2xl"}
            type="button"
            variant={defaultParentBookId ? "outline" : "default"}
            size={iconOnly ? "icon-lg" : defaultParentBookId ? "sm" : "default"}
            title={iconOnly ? triggerLabel : undefined}
          >
            <Icon icon={Plus} />
            {iconOnly ? <span className="sr-only">{triggerLabel}</span> : triggerLabel}
          </Button>
        }
      />
      <ModalContent className="sm:max-w-xl">
        <ModalHeader>
          <ModalTitle>Create book</ModalTitle>
          <ModalDescription>Add a book for grouping flashcards.</ModalDescription>
        </ModalHeader>
        <ModalBody>
        <Form id={formId} className="gap-4" onSubmit={handleSubmit}>
          <FormField>
            <FormLabel htmlFor={`${formId}-title`}>Title</FormLabel>
            <FormInput
              id={`${formId}-title`}
              name="title"
              required
              className="h-10"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor={`${formId}-description`}>Description</FormLabel>
            <FormTextarea
              id={`${formId}-description`}
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor={`${formId}-parent`}>Location</FormLabel>
            <Select
              value={parentBookId || "top-level"}
              onValueChange={(value) =>
                setParentBookId(value === "top-level" ? "" : value ?? "")
              }
            >
              <SelectTrigger id={`${formId}-parent`} className="h-10 w-full">
                <span className="truncate text-left">
                  {books.find((book) => book.id === parentBookId)?.title ?? "Top level"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-level">Top level</SelectItem>
                {books.filter((book) => !book.parentBookId).map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    Inside {book.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-2xl"
                disabled={isGeneratingBackgrounds || !title.trim()}
                onClick={handleGenerateBackgrounds}
              >
                {isGeneratingBackgrounds ? (
                  <Icon icon={Loader2} className="animate-spin" />
                ) : (
                  <Icon icon={Sparkles} />
                )}
                Generate covers
              </Button>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={useCoverUpload}
                  onCheckedChange={(checked) => {
                    const shouldUpload = Boolean(checked);
                    setUseCoverUpload(shouldUpload);
                    if (shouldUpload) setSelectedBackground("");
                  }}
                  aria-label="Upload cover image"
                />
                <span className="text-sm font-medium">Upload cover image</span>
              </label>
            </div>

            {generatedBackgrounds.length ? (
              <div className="grid grid-cols-3 gap-2">
                {generatedBackgrounds.map((url, index) => {
                  const isSelected = selectedBackground === url;

                  return (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`Choose generated book cover ${index + 1}`}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border bg-card transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/60"
                      )}
                      onClick={() => {
                        setSelectedBackground(url);
                        setUseCoverUpload(false);
                        setCoverFileName("");
                      }}
                    >
                      <span
                        className="block aspect-[4/3] bg-secondary bg-cover bg-center"
                        style={{ backgroundImage: `url(${url})` }}
                      />
                      {isSelected ? (
                        <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                          <Icon icon={Check} size="sm" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {useCoverUpload ? (
              <FileInput
                id={`${formId}-cover`}
                name="coverImage"
                accept="image/*"
                label="Choose image"
                fileName={coverFileName}
                onFileNameChange={(fileName) => {
                  setCoverFileName(fileName);
                  if (fileName) setSelectedBackground("");
                }}
              />
            ) : null}
          </FormField>

          <FormField>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={useBookUpload}
                onCheckedChange={(checked) => setUseBookUpload(Boolean(checked))}
                aria-label="Import content from file"
              />
              <span className="text-sm font-medium">Import content from file</span>
            </label>

            {useBookUpload ? (
              <div className="grid gap-3">
                <FileInput
                  id={`${formId}-file`}
                  name="file"
                  accept=".txt,.pdf,.doc,.docx,.epub,text/plain,application/pdf"
                  label="Choose file"
                  fileName={bookFileName}
                  onFileNameChange={setBookFileName}
                />
                <FormField>
                  <FormLabel htmlFor={`${formId}-content`}>Fallback content</FormLabel>
                  <FormTextarea
                    id={`${formId}-content`}
                    name="content"
                    placeholder="Paste text here if the file cannot be extracted"
                  />
                </FormField>
              </div>
            ) : null}
          </FormField>
          {selectedBackground ? (
            <input type="hidden" name="coverImage" value={selectedBackground} />
          ) : null}
          <input type="hidden" name="isPublic" value="false" />
        </Form>
        </ModalBody>
        <ModalFooter>
          <ModalActionButton form={formId} disabled={isSubmitting}>
            {isSubmitting ? (
              <Icon icon={Loader2} className="animate-spin" />
            ) : (
              <Icon icon={Plus} />
            )}
            Save book
          </ModalActionButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function FileInput({
  id,
  name,
  accept,
  label,
  fileName,
  onFileNameChange,
}: {
  id: string;
  name: string;
  accept: string;
  label: string;
  fileName: string;
  onFileNameChange: (fileName: string) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) =>
          onFileNameChange(event.currentTarget.files?.[0]?.name ?? "")
        }
      />
      <Button
        render={<label htmlFor={id} />}
        nativeButton={false}
        type="button"
        variant="outline"
        className="h-10 rounded-2xl"
      >
        {label}
      </Button>
      <Text as="span" className="min-w-0 truncate" size="sm" tone="muted">
        {fileName || "No file selected"}
      </Text>
    </div>
  );
}
