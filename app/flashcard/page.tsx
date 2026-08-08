import Link from "next/link";
import { ArrowLeft, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateFlashcardDialog } from "@/components/flashcards/create-flashcard-dialog";
import { FlashcardGrid } from "@/components/flashcards/flashcard-grid";
import { getBook, getBooks, getFlashcardsByBook } from "@/lib/dashboard-data";

type FlashcardPageProps = {
  searchParams: Promise<{
    bookId?: string;
  }>;
};

export default async function FlashcardPage({
  searchParams,
}: FlashcardPageProps) {
  const [{ bookId }, books] = await Promise.all([searchParams, getBooks()]);
  const selectedBookId = bookId ?? books[0]?.id;

  if (!selectedBookId) {
    return (
      <div className="grid max-w-4xl gap-6">
        <Button
          render={<Link href="/dashboard/books" />}
          nativeButton={false}
          variant="outline"
          className="w-fit rounded-2xl"
        >
          <ArrowLeft className="size-4" />
          Books
        </Button>
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>No books found</CardTitle>
            <CardDescription>
              Create or import a book to view flashcards.
            </CardDescription>
          </CardHeader>
        </Card>
        <CreateFlashcardDialog books={books} />
      </div>
    );
  }

  const [book, flashcards] = await Promise.all([
    getBook(selectedBookId),
    getFlashcardsByBook(selectedBookId),
  ]);

  return (
    <div className="grid max-w-6xl gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            render={<Link href="/dashboard/books" />}
            nativeButton={false}
            variant="outline"
            size="icon-lg"
            className="mt-1 shrink-0 rounded-2xl"
          >
            <ArrowLeft className="size-4" />
            <span className="sr-only">Books</span>
          </Button>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Flashcards</p>
            <h1 className="mt-1 truncate text-3xl font-semibold">
              {book?.title ?? "Selected book"}
            </h1>
            {book?.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {book.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="h-8 w-fit rounded-2xl px-3">
            <Layers3 className="size-4 text-primary" />
            {flashcards.length} cards
          </Badge>
          <CreateFlashcardDialog books={books} defaultBookId={selectedBookId} />
        </div>
      </section>

      {flashcards.length > 0 ? (
        <FlashcardGrid flashcards={flashcards} />
      ) : (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>No flashcards found</CardTitle>
            <CardDescription>
              This book does not have flashcards yet.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
