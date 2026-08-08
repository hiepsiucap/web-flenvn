"use client";

import Link from "next/link";
import { BookOpen, Layers3, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HttpError, http } from "@/lib/http";
import type { ApiErrorResponse } from "@/lib/auth-types";
import type { Book } from "@/lib/dashboard-data";

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return data?.message || "Unable to delete book";
  }

  return "Unable to delete book";
}

export function BooksGrid({ books }: { books: Book[] }) {
  const router = useRouter();
  const [deletingBookId, setDeletingBookId] = useState("");

  async function handleDelete(book: Book) {
    const shouldDelete = window.confirm(
      `Delete "${book.title}"? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingBookId(book.id);

    try {
      await http.delete(`/api/books/${book.id}`);
      toast.success("Book deleted");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingBookId("");
    }
  }

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {books.map((book) => (
        <Card
          key={book.id}
          className="group relative h-full overflow-hidden rounded-3xl transition-colors hover:border-primary/60"
        >
          <Link
            href={`/flashcard?bookId=${encodeURIComponent(book.id)}`}
            className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 p-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="h-24 overflow-hidden rounded-2xl bg-secondary">
              {book.coverImage ? (
                <div
                  className="h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url(${book.coverImage})` }}
                />
              ) : (
                <div className="grid h-full place-items-center text-primary">
                  <BookOpen className="size-8" />
                </div>
              )}
            </div>
            <div className="grid min-w-0 gap-2">
              <CardHeader className="p-0">
                <CardTitle className="line-clamp-1 text-base">
                  {book.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {book.description || "Open this book to view flashcards."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 p-0 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Layers3 className="size-3.5" />
                  {book.totalCards ?? 0} cards
                </span>
                {book.wordCount ? <span>{book.wordCount} words</span> : null}
              </CardContent>
            </div>
          </Link>

          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            className="absolute right-3 top-3 opacity-100 shadow-md sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
            disabled={deletingBookId === book.id}
            onClick={() => handleDelete(book)}
          >
            {deletingBookId === book.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            <span className="sr-only">Delete book</span>
          </Button>
        </Card>
      ))}
    </section>
  );
}
