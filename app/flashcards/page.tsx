import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { FlashcardBookView } from "@/components/flashcards/flashcard-book-view";
import { getBook, getBooks, getFlashcardsByBook, getLabels } from "@/lib/dashboard-data";
import type { LabelFilterMode } from "@/lib/dashboard-data";
import emptyFolderImage from "@/img/empty-folder.png";

type FlashcardPageProps = {
  searchParams: Promise<{
    bookId?: string;
    labelIds?: string;
    labelMode?: string;
  }>;
};

export default async function FlashcardPage({
  searchParams,
}: FlashcardPageProps) {
  const [{ bookId, labelIds, labelMode }, books] = await Promise.all([searchParams, getBooks()]);
  const selectedBookId = bookId ?? books[0]?.id;
  const selectedLabelIds = [...new Set(labelIds?.split(",").filter(Boolean) ?? [])];
  const selectedLabelMode: LabelFilterMode = labelMode === "all" ? "all" : "any";

  if (!selectedBookId) {
    return (
      <div className="grid w-full gap-6">
        <Button
          render={<Link href="/books" />}
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

  const [book, flashcards, labels] = await Promise.all([
    getBook(selectedBookId),
    getFlashcardsByBook(selectedBookId),
    getLabels(true),
  ]);

  return (
    <FlashcardBookView
      key={selectedBookId}
      book={book}
      books={books}
      flashcards={flashcards}
      labels={labels}
      initialLabelIds={selectedLabelIds}
      initialLabelMode={selectedLabelMode}
    />
  );
}
