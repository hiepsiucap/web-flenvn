import { FlipFlashcardReviewer } from "@/components/flashcards/flip-flashcard-reviewer";
import { getBooks, getFlashcardsByBook } from "@/lib/dashboard-data";

type FlipFlashcardsPageProps = {
  searchParams: Promise<{
    bookId?: string;
  }>;
};

export default async function FlipFlashcardsPage({
  searchParams,
}: FlipFlashcardsPageProps) {
  const [{ bookId }, books] = await Promise.all([searchParams, getBooks()]);
  const selectedBook =
    books.find((book) => book.id === bookId) ?? books[0] ?? null;
  const flashcards = selectedBook
    ? await getFlashcardsByBook(selectedBook.id)
    : [];

  return (
    <FlipFlashcardReviewer
      key={selectedBook?.id ?? "no-book"}
      books={books}
      flashcards={flashcards}
      selectedBook={selectedBook}
    />
  );
}
