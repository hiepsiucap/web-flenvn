"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FlipFlashcardReviewer } from "@/components/flashcards/flip-flashcard-reviewer";
import { LoadingState } from "@/components/ui/loading-state";
import { CLIENT_DATA_CHANGED_EVENT, getBooksClient, getFlashcardsByBookClient } from "@/lib/client-api";
import type { Book, Flashcard } from "@/lib/dashboard-data";

export default function FlipFlashcardsPage() {
  return (
    <Suspense fallback={<LoadingState title="Loading study cards" description="Preparing your flashcards." />}>
      <FlipFlashcardsPageContent />
    </Suspense>
  );
}

function FlipFlashcardsPageContent() {
  const bookId = useSearchParams().get("bookId") ?? undefined;
  const [data, setData] = useState<{
    books: Book[];
    selectedBook: Book | null;
    flashcards: Flashcard[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      void getBooksClient().then(async (books) => {
        const selectedBook = books.find((book) => book.id === bookId) ?? books[0] ?? null;
        const flashcards = selectedBook
          ? await getFlashcardsByBookClient(selectedBook.id)
          : [];
        if (active) setData({ books, selectedBook, flashcards });
      });
    };
    load();
    window.addEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    };
  }, [bookId]);

  if (!data) {
    return <LoadingState title="Loading study cards" description="Preparing your flashcards." />;
  }

  return (
    <FlipFlashcardReviewer
      key={data.selectedBook?.id ?? "no-book"}
      books={data.books}
      flashcards={data.flashcards}
      selectedBook={data.selectedBook}
    />
  );
}
