import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Stack as Layers3 } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { CreateFlashcardDialog } from "@/components/flashcards/create-flashcard-dialog";
import { FlashcardGrid } from "@/components/flashcards/flashcard-grid";
import { getBook, getBooks, getFlashcardsByBook } from "@/lib/dashboard-data";
import emptyFolderImage from "@/img/empty-folder.png";

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
      <div className="grid w-full gap-6">
        <Button
          render={<Link href="/dashboard/books" />}
          nativeButton={false}
          variant="outline"
          className="w-fit rounded-2xl"
        >
          <Icon icon={ArrowLeft} />
          Books
        </Button>
        <section className="grid min-h-[calc(100vh-14rem)] w-full place-items-center px-6 py-12 text-center">
          <div className="flex max-w-sm flex-col items-center">
            <Image
              src={emptyFolderImage}
              alt=""
              className="h-auto w-52"
              priority
            />
            <Text as="div" className="mt-6" size="xl" weight="semibold">
              No books found
            </Text>
            <Text className="mt-2" size="sm" tone="muted">
              Create or import a book before adding flashcards.
            </Text>
            <div className="mt-6 flex justify-center">
              <CreateBookDialog />
            </div>
          </div>
        </section>
      </div>
    );
  }

  const [book, flashcards] = await Promise.all([
    getBook(selectedBookId),
    getFlashcardsByBook(selectedBookId),
  ]);

  return (
    <div className="grid w-full gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            render={<Link href="/dashboard/books" />}
            nativeButton={false}
            variant="outline"
            size="icon-lg"
            className="mt-1 shrink-0 rounded-2xl"
          >
            <Icon icon={ArrowLeft} />
            <span className="sr-only">Books</span>
          </Button>
          <div className="min-w-0">
            <Text size="sm" tone="muted">Flashcards</Text>
            <Text as="div" className="mt-1 truncate" size="3xl" weight="semibold">
              {book?.title ?? "Selected book"}
            </Text>
            {book?.description ? (
              <Text className="mt-2 max-w-2xl leading-6" size="sm" tone="muted">
                {book.description}
              </Text>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="h-8 w-fit rounded-2xl px-3">
            <Icon icon={Layers3} className="text-primary" />
            {flashcards.length} cards
          </Badge>
          <CreateFlashcardDialog books={books} defaultBookId={selectedBookId} />
        </div>
      </section>

      {flashcards.length > 0 ? (
        <FlashcardGrid flashcards={flashcards} />
      ) : (
        <section className="grid min-h-[calc(100vh-16rem)] w-full place-items-center px-6 py-12 text-center">
          <div className="flex max-w-sm flex-col items-center">
            <Image
              src={emptyFolderImage}
              alt=""
              className="h-auto w-52"
              priority
            />
            <Text as="div" className="mt-6" size="xl" weight="semibold">
              No flashcards found
            </Text>
            <Text className="mt-2" size="sm" tone="muted">
              Add your first card to start reviewing this book.
            </Text>
            <div className="mt-6 flex justify-center">
              <CreateFlashcardDialog
                books={books}
                defaultBookId={selectedBookId}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
