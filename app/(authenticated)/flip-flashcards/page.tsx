"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

  const [loadError, setLoadError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => {
      setLoadError(false);
      void getBooksClient().then(async (books) => {
        const selectedBook = books.find((book) => book.id === bookId) ?? books[0] ?? null;
        const flashcards = selectedBook
          ? await getFlashcardsByBookClient(selectedBook.id)
          : [];
        if (active) setData({ books, selectedBook, flashcards });
      }).catch(() => {
        if (active) setLoadError(true);
      });
    };
    load();
    window.addEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    };
  }, [bookId, loadKey]);

  if (loadError) {
    return <EmptyState illustration="connection" title="Study cards unavailable" description="We couldn’t load your cards. Please try again." action={<Button onClick={() => setLoadKey((key) => key + 1)}>Try again</Button>} />;
  }

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
