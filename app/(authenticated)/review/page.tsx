"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { PracticeRunner } from "@/components/practice/practice-runner";
import { CLIENT_DATA_CHANGED_EVENT, getBooksClient, getReviewDueBooksClient } from "@/lib/client-api";
import type { Book, ReviewDueBooksResponse } from "@/lib/dashboard-data";

export default function ReviewPage() {
  const [data, setData] = useState<{
    dueBooks: ReviewDueBooksResponse;
    books: Book[];
  } | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const load = () => {
      setLoadError("");
      void Promise.all([getReviewDueBooksClient(), getBooksClient()]).then(([dueBooks, books]) => {
        if (active) setData({ dueBooks, books });
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
      <EmptyState illustration="connection" title="Review unavailable" description={loadError}
        action={<Button onClick={() => window.dispatchEvent(new Event(CLIENT_DATA_CHANGED_EVENT))}>Try again</Button>}
      />
    );
  }

  if (!data) {
    return <LoadingState title="Loading review" description="Preparing cards that are due." />;
  }

  if (!data.books.length) {
    return (
      <EmptyState
        illustration="books"
        title="No books yet"
        description="Create a book and add flashcards before starting practice."
        action={<CreateBookDialog />}
      />
    );
  }

  if (!data.books.some((book) => book.totalCards > 0)) {
    return <EmptyState illustration="books" title="No flashcards yet" description="Add flashcards to a book to start practicing." action={<Button render={<Link href="/books" />} nativeButton={false}>Open books</Button>} />;
  }

  const practiceBooks = data.books.map((book) => ({
    bookId: book.id,
    title: book.title,
    totalCards: book.totalCards,
    dueForReview: data.dueBooks.books.find((dueBook) => (dueBook.bookId ?? dueBook.id) === book.id)?.dueForReview ?? 0,
  }));

  return <PracticeRunner books={practiceBooks} bookHierarchy={data.books} />;
}
