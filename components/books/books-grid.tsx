"use client";

import Link from "next/link";
import {
  BookOpen,
  CaretRight,
  DotsThreeVertical,
  PencilSimple,
  Spinner as Loader2,
  Stack as Layers3,
  Trash as Trash2,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { notifyClientDataChanged } from "@/lib/client-api";
import { HttpError, http } from "@/lib/http";
import type { ApiErrorResponse } from "@/lib/auth-types";
import type { Book } from "@/lib/dashboard-data";
import { EditBookDialog } from "@/components/books/edit-book-dialog";
import { cn } from "@/lib/utils";

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return data?.message || "Unable to delete book";
  }

  return "Unable to delete book";
}

export function BooksGrid({
  books,
  visibleBooks = books,
  view = "grid",
}: {
  books: Book[];
  visibleBooks?: Book[];
  view?: "grid" | "list";
}) {
  const [deletingBookId, setDeletingBookId] = useState("");

  async function handleDelete(book: Book) {
    if (books.some((item) => item.parentBookId === book.id)) {
      toast.error("Move or delete this book's sub-books first.");
      return;
    }
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
      notifyClientDataChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingBookId("");
    }
  }

  function renderBookCard(book: Book) {
    return (
        <Card
          key={book.id}
          className={cn(
            "group relative overflow-hidden rounded-3xl transition-shadow hover:shadow-md hover:shadow-foreground/10",
            view === "grid" ? "gap-0 py-0" : "min-h-32"
          )}
        >
          <Link
            href={`/books/${encodeURIComponent(book.id)}`}
            className={cn(
              "grid gap-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              view === "grid"
                ? "p-0"
                : "grid-cols-[80px_minmax(0,1fr)] p-3 pb-14 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-4 sm:p-4 sm:pr-32"
            )}
          >
            <div className={cn(
              "relative overflow-hidden bg-secondary",
              view === "grid" ? "aspect-[4/3] w-full rounded-[inherit]" : "aspect-square w-full rounded-2xl"
            )}>
              {book.coverImage ? (
                <div
                  className="h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url(${book.coverImage})` }}
                />
              ) : (
                <div className="grid h-full place-items-center text-primary">
                  <Icon icon={BookOpen} className="size-8" />
                </div>
              )}
              {view === "grid" ? (
                <div className="absolute inset-x-0 bottom-0 z-10 w-full border-t border-border/40 bg-background/75 px-3 py-2.5 backdrop-blur-sm">
                  <p className="truncate text-sm font-semibold text-foreground">{book.title}</p>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Icon icon={Layers3} size="sm" />
                    {book.totalCards ?? 0} direct cards
                  </span>
                </div>
              ) : null}
            </div>
            {view === "list" ? (
            <div className="grid min-w-0 content-center gap-2">
              <CardHeader className="p-0">
                <CardTitle className="line-clamp-1 text-lg">
                  {book.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-sm">
                  {book.description || "Open this book to view flashcards."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 p-0 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Icon icon={Layers3} size="sm" />
                  {book.totalCards ?? 0} direct cards
                </span>
                {book.wordCount ? (
                  <Text as="span" size="xs" tone="muted">
                    {book.wordCount} words
                  </Text>
                ) : null}
              </CardContent>
              <Icon
                icon={CaretRight}
                className="absolute right-5 top-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </div>
            ) : null}
          </Link>

          {view === "grid" ? (
            <div className="absolute right-2 top-2 z-20">
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="bg-background/85 shadow-sm backdrop-blur-sm"
                    aria-label={`Actions for ${book.title}`}
                  >
                    <Icon icon={DotsThreeVertical} weight="bold" />
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-36">
                  <EditBookDialog
                    book={book}
                    books={books}
                    trigger={
                      <DropdownMenuItem>
                        <Icon icon={PencilSimple} />
                        Edit
                      </DropdownMenuItem>
                    }
                  />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={deletingBookId === book.id}
                    onClick={() => void handleDelete(book)}
                  >
                    {deletingBookId === book.id ? (
                      <Icon icon={Loader2} className="animate-spin" />
                    ) : (
                      <Icon icon={Trash2} />
                    )}
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="absolute bottom-4 right-4 flex justify-end gap-2">
              <EditBookDialog book={book} books={books} />
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                className="size-10 shadow-md sm:size-8"
                disabled={deletingBookId === book.id}
                onClick={() => handleDelete(book)}
              >
                {deletingBookId === book.id ? (
                  <Icon icon={Loader2} className="animate-spin" />
                ) : (
                  <Icon icon={Trash2} />
                )}
                <span className="sr-only">Delete book</span>
              </Button>
            </div>
          )}
        </Card>
    );
  }

  return (
    <section className={cn(
      "grid items-start gap-5",
      view === "grid" && "grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4"
    )}>
      {visibleBooks.map((book) => renderBookCard(book))}
    </section>
  );
}
