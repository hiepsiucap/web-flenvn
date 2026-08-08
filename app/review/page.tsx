import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PracticeRunner } from "@/components/practice/practice-runner";
import {
  getFlashcardsByBook,
  getReviewDueBooks,
} from "@/lib/dashboard-data";

export default async function ReviewPage() {
  const dueBooks = await getReviewDueBooks();
  const selectedBook = dueBooks.books.find((book) => book.dueForReview > 0);
  const flashcardPool = selectedBook
    ? await getFlashcardsByBook(selectedBook.bookId)
    : [];

  if (!dueBooks.books.length) {
    return (
      <Card className="max-w-3xl rounded-3xl">
        <CardHeader>
          <CardTitle>No books found</CardTitle>
          <CardDescription>
            Create a book and add flashcards before starting practice.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <PracticeRunner books={dueBooks.books} flashcardPool={flashcardPool} />;
}
