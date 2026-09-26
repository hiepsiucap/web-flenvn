"use client";

import { FormEvent, useState } from "react";
import { PencilSimple, Spinner } from "@phosphor-icons/react";
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
  const [saving, setSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (saving) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setTitle(book.title);
      setCoverFile(null);
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
      setCoverFile(null);
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
              {book.coverImage ? (
                // The cover URL can come from the existing book or the managed image service.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.coverImage} alt="Current book cover" className="h-28 w-28 rounded-xl object-cover" />
              ) : null}
              <FormInput
                id={`edit-book-cover-${book.id}`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Up to 5 MB. Leave empty to keep the current cover.</p>
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
