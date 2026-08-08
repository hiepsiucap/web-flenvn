"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-10 rounded-2xl" type="button">
            <Plus className="size-4" />
            Create book
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create book</DialogTitle>
          <DialogDescription>Add a book for grouping flashcards.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="book-title">Title</Label>
            <Input id="book-title" name="title" required className="h-10" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="book-description">Description</Label>
            <Textarea id="book-description" name="description" />
          </div>

          <div className="grid gap-2">
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
          </div>

          <div className="grid gap-2">
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
                <div className="grid gap-2">
                  <Label htmlFor="book-content">Fallback content</Label>
                  <Textarea
                    id="book-content"
                    name="content"
                    placeholder="Paste text here if the file cannot be extracted"
                  />
                </div>
              </div>
            ) : null}
          </div>
          <input type="hidden" name="isPublic" value="false" />
          <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent px-0 pb-0">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save book
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
      <span className="min-w-0 truncate text-sm text-muted-foreground">
        {fileName || "No file selected"}
      </span>
    </div>
  );
}
