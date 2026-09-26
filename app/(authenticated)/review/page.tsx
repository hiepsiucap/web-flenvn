"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { PracticeRunner } from "@/components/practice/practice-runner";
import { CLIENT_DATA_CHANGED_EVENT, getFlashcardsByBookClient, getReviewDueBooksClient } from "@/lib/client-api";
import type { Flashcard, ReviewDueBooksResponse } from "@/lib/dashboard-data";

export default function ReviewPage() {
  const [data, setData] = useState<{
    dueBooks: ReviewDueBooksResponse;
    flashcardPool: Flashcard[];
  } | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const load = () => {
      setLoadError("");
      void getReviewDueBooksClient().then(async (dueBooks) => {
        const selectedBook = dueBooks.books.find((book) => book.dueForReview > 0);
        const flashcardPool = selectedBook
          ? await getFlashcardsByBookClient(selectedBook.bookId)
          : [];
        if (active) setData({ dueBooks, flashcardPool });
      }).catch(() => {
        if (active) setLoadError("Unable to load review data. Please try again.");
      });
    };
    load();
    window.addEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    };
  }, []);

  if (loadError && !data) {
    return (
      <Card className="max-w-3xl rounded-3xl">
        <CardHeader>
          <CardTitle>Review unavailable</CardTitle>
          <CardDescription>{loadError}</CardDescription>
          <Button
            type="button"
            className="mt-3 w-fit"
            onClick={() => window.dispatchEvent(new Event(CLIENT_DATA_CHANGED_EVENT))}
          >
            Try again
          </Button>
        </CardHeader>
      </Card>
    );
  }

  if (!data) {
    return <LoadingState title="Loading review" description="Preparing cards that are due." />;
  }

  if (!data.dueBooks.books.length) {
    return (
      <EmptyState
        title="No books yet"
        description="Create a book and add flashcards before starting practice."
        action={<CreateBookDialog />}
      />
    );
  }

  return <PracticeRunner books={data.dueBooks.books} flashcardPool={data.flashcardPool} />;
}
