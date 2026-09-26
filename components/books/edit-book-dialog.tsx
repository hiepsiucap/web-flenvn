"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, PencilSimple, Spinner, X } from "@phosphor-icons/react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Form, FormField, FormInput, FormLabel } from "@/components/ui/form";
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
import type { ApiErrorResponse } from "@/lib/auth-types";
import { buildBookEditPayload } from "@/lib/book-edit";
import { notifyClientDataChanged } from "@/lib/client-api";
import type { Book } from "@/lib/dashboard-data";
import { HttpError, http } from "@/lib/http";

type PresignResponse = { uploadUrl: string; fileUrl: string; headers?: Record<string, string> };
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageBytes = 5 * 1024 * 1024;

function errorMessage(error: unknown) {
  if (error instanceof HttpError) {
    return (error.data as ApiErrorResponse | null)?.message || "Unable to update book";
  }
  return error instanceof Error ? error.message : "Unable to update book";
}

async function uploadCover(file: File) {
  const result = await http.post<PresignResponse | { data: PresignResponse }>(
    "/api/uploads/presign-image",
    { contentType: file.type, fileName: file.name, folder: "books" }
  );
  const presign = "data" in result ? result.data : result;
  const response = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type, ...presign.headers },
    body: file,
  });
  if (!response.ok) throw new Error("Unable to upload book cover");
  return presign.fileUrl;
}

export function EditBookDialog({ book }: { book: Book }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function clearCoverFile() {
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function handleCoverChange(file: File | null) {
    if (!file) return;
    if (!allowedImageTypes.includes(file.type)) {
      toast.error("Choose a JPEG, PNG, or WebP image.");
      clearCoverFile();
      return;
    }
    if (file.size > maxImageBytes) {
      toast.error("Cover image must be 5 MB or smaller.");
      clearCoverFile();
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (saving) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setTitle(book.title);
      clearCoverFile();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let validatedTitle: string;
    try {
      validatedTitle = buildBookEditPayload(title).title;
      if (coverFile) {
        if (!allowedImageTypes.includes(coverFile.type)) {
          throw new Error("Choose a JPEG, PNG, or WebP image.");
        }
        if (coverFile.size > maxImageBytes) {
          throw new Error("Cover image must be 5 MB or smaller.");
        }
      }
    } catch (error) {
      toast.error(errorMessage(error));
      return;
    }

    setSaving(true);
    try {
      const coverImage = coverFile ? await uploadCover(coverFile) : undefined;
      await http.put(`/api/books/${encodeURIComponent(book.id)}`, buildBookEditPayload(validatedTitle, coverImage));
      toast.success("Book updated");
      setOpen(false);
      clearCoverFile();
      notifyClientDataChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalTrigger render={
        <Button type="button" variant="secondary" size="icon-sm" aria-label={`Edit ${book.title}`}>
          <Icon icon={PencilSimple} />
        </Button>
      } />
      <ModalContent className="sm:max-w-md">
        <ModalHeader>
          <ModalTitle>Edit book</ModalTitle>
          <ModalDescription>Change the title or cover photo of this book.</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <Form id={`edit-book-${book.id}`} className="gap-4" onSubmit={handleSubmit}>
            <FormField>
              <FormLabel htmlFor={`edit-book-title-${book.id}`}>Title</FormLabel>
              <FormInput
                id={`edit-book-title-${book.id}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={3}
                maxLength={255}
              />
            </FormField>
            <FormField>
              <FormLabel htmlFor={`edit-book-cover-${book.id}`}>Cover photo</FormLabel>
              <div className="flex items-center gap-4">
                <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-secondary text-muted-foreground">
                  {coverPreview || book.coverImage ? (
                    // The cover URL can come from the existing book or the managed image service.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverPreview ?? book.coverImage ?? ""}
                      alt={coverFile ? "New book cover preview" : "Current book cover"}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Icon icon={ImageIcon} className="size-8" />
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-medium">
                    {coverFile ? "New cover selected" : book.coverImage ? "Current cover" : "No cover yet"}
                  </p>
                  <FormInput
                    ref={coverInputRef}
                    id={`edit-book-cover-${book.id}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={(event) => handleCoverChange(event.target.files?.[0] ?? null)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {book.coverImage || coverFile ? "Replace image" : "Choose image"}
                    </Button>
                    {coverFile ? (
                      <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={clearCoverFile}>
                        <Icon icon={X} />
                        Undo
                      </Button>
                    ) : null}
                  </div>
                  {coverFile ? <p className="truncate text-xs text-muted-foreground" title={coverFile.name}>{coverFile.name}</p> : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · Up to 5 MB</p>
            </FormField>
          </Form>
        </ModalBody>
        <ModalFooter>
          <ModalActionButton form={`edit-book-${book.id}`} disabled={saving}>
            {saving ? <Icon icon={Spinner} className="animate-spin" /> : null}
            Save changes
          </ModalActionButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
