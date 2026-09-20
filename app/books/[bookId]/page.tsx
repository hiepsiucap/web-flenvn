import { FlashcardBookView } from "@/components/flashcards/flashcard-book-view";
import {
  getBook,
  getBooks,
  getFlashcardsByBook,
  getLabels,
} from "@/lib/dashboard-data";
import type { LabelFilterMode } from "@/lib/dashboard-data";

type BookFlashcardsPageProps = {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{
    labelIds?: string;
    labelMode?: string;
  }>;
};

export default async function BookFlashcardsPage({
  params,
  searchParams,
}: BookFlashcardsPageProps) {
  const [{ bookId }, { labelIds, labelMode }, books] = await Promise.all([
    params,
    searchParams,
    getBooks(),
  ]);
  const selectedLabelIds = [...new Set(labelIds?.split(",").filter(Boolean) ?? [])];
  const selectedLabelMode: LabelFilterMode = labelMode === "all" ? "all" : "any";
  const [book, flashcards, labels] = await Promise.all([
    getBook(bookId),
    getFlashcardsByBook(bookId),
    getLabels(true),
  ]);

  return (
    <FlashcardBookView
      key={bookId}
      book={book}
      books={books}
      flashcards={flashcards}
      labels={labels}
      initialLabelIds={selectedLabelIds}
      initialLabelMode={selectedLabelMode}
    />
  );
}
