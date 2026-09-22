"use client";

import { useEffect, useState } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PracticeRunner } from "@/components/practice/practice-runner";
import { CLIENT_DATA_CHANGED_EVENT, getFlashcardsByBookClient, getReviewDueBooksClient } from "@/lib/client-api";
import type { Flashcard, ReviewDueBooksResponse } from "@/lib/dashboard-data";

export default function ReviewPage() {
  const [data, setData] = useState<{
    dueBooks: ReviewDueBooksResponse;
    flashcardPool: Flashcard[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      void getReviewDueBooksClient().then(async (dueBooks) => {
        const selectedBook = dueBooks.books.find((book) => book.dueForReview > 0);
        const flashcardPool = selectedBook
          ? await getFlashcardsByBookClient(selectedBook.bookId)
          : [];
        if (active) setData({ dueBooks, flashcardPool });
      });
    };
    load();
    window.addEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    };
  }, []);

  if (!data) {
    return <LoadingState title="Loading review" description="Preparing cards that are due." />;
  }

  if (!data.dueBooks.books.length) {
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

  return <PracticeRunner books={data.dueBooks.books} flashcardPool={data.flashcardPool} />;
}
