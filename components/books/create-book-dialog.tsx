"use client";

import { FormEvent, useState } from "react";
import { Plus, Spinner as Loader2 } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormActions,
  FormField,
  FormInput,
  FormLabel,
  FormTextarea,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { HttpError, http } from "@/lib/http";
import type { ApiErrorResponse } from "@/lib/auth-types";

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return data?.message || "Unable to create book";
  }

  return "Unable to create book";
}

export function CreateBookDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [useCoverUpload, setUseCoverUpload] = useState(false);
  const [useBookUpload, setUseBookUpload] = useState(false);
  const [coverFileName, setCoverFileName] = useState("");
  const [bookFileName, setBookFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    if (!useCoverUpload) {
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
      setUseCoverUpload(false);
      setUseBookUpload(false);
      setCoverFileName("");
      setBookFileName("");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger
        render={
          <Button className="h-10 rounded-2xl" type="button">
            <Icon icon={Plus} />
            Create book
          </Button>
        }
      />
      <ModalContent className="max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain sm:max-w-xl">
        <ModalHeader>
          <ModalTitle>Create book</ModalTitle>
          <ModalDescription>Add a book for grouping flashcards.</ModalDescription>
        </ModalHeader>
        <Form className="gap-4" onSubmit={handleSubmit}>
          <FormField>
            <FormLabel htmlFor="book-title">Title</FormLabel>
            <FormInput id="book-title" name="title" required className="h-10" />
          </FormField>
          <FormField>
            <FormLabel htmlFor="book-description">Description</FormLabel>
            <FormTextarea id="book-description" name="description" />
          </FormField>

          <FormField>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={useCoverUpload}
                onCheckedChange={(checked) => setUseCoverUpload(Boolean(checked))}
                aria-label="Upload cover image"
              />
              <span className="text-sm font-medium">Upload cover image</span>
            </label>

            {useCoverUpload ? (
              <FileInput
                id="book-cover"
                name="coverImage"
                accept="image/*"
                label="Choose image"
                fileName={coverFileName}
                onFileNameChange={setCoverFileName}
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
                  id="book-file"
                  name="file"
                  accept=".txt,.pdf,.doc,.docx,.epub,text/plain,application/pdf"
                  label="Choose file"
                  fileName={bookFileName}
                  onFileNameChange={setBookFileName}
                />
                <FormField>
                  <FormLabel htmlFor="book-content">Fallback content</FormLabel>
                  <FormTextarea
                    id="book-content"
                    name="content"
                    placeholder="Paste text here if the file cannot be extracted"
                  />
                </FormField>
              </div>
            ) : null}
          </FormField>
          <input type="hidden" name="isPublic" value="false" />
          <FormActions>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Icon icon={Loader2} className="animate-spin" />
              ) : (
                <Icon icon={Plus} />
              )}
              Save book
            </Button>
          </FormActions>
        </Form>
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
