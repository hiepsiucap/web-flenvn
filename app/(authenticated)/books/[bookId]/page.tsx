"use client";

import Link from "next/link";
import { HttpError } from "@/lib/http";
import { EmptyState } from "@/components/ui/empty-state";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { FlashcardBookView } from "@/components/flashcards/flashcard-book-view";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import {
  CLIENT_DATA_CHANGED_EVENT,
  getBookClient,
  getBooksClient,
  getFlashcardsByBookClient,
  getLabelsClient,
} from "@/lib/client-api";
import type { Book, Flashcard, LabelCatalogItem, LabelFilterMode } from "@/lib/dashboard-data";

export default function BookFlashcardsPage() {
  return (
    <Suspense fallback={<LoadingState title="Loading flashcards" description="Loading this book and its cards." />}>
      <BookFlashcardsPageContent />
    </Suspense>
  );
}

function BookFlashcardsPageContent() {
  const { bookId } = useParams<{ bookId: string }>();
  const searchParams = useSearchParams();
  const labelIds = searchParams.get("labelIds") ?? undefined;
  const labelMode = searchParams.get("labelMode") ?? undefined;
  const selectedLabelIds = [...new Set(labelIds?.split(",").filter(Boolean) ?? [])];
  const selectedLabelMode: LabelFilterMode = labelMode === "all" ? "all" : "any";
  const [data, setData] = useState<{
    book: Book;
    books: Book[];
    flashcards: Flashcard[];
    labels: LabelCatalogItem[];
  } | null>(null);
  const [loadError, setLoadError] = useState<number | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => {
      setLoadError(null);
      void Promise.all([
        getBookClient(bookId),
        getBooksClient(),
        getFlashcardsByBookClient(bookId),
        getLabelsClient(true),
      ]).then(([book, books, flashcards, labels]) => {
        if (active) setData({ book, books, flashcards, labels });
      }).catch((error) => {
        if (active) setLoadError(error instanceof HttpError ? error.status : 500);
      });
    };
    load();
    window.addEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    };
  }, [bookId, loadKey]);

  if (loadError && !data) {
    return (
      <EmptyState
        illustration={loadError === 404 ? "not-found" : "connection"}
        title={loadError === 404 ? "Book not found" : "Book unavailable"}
        description={loadError === 404 ? "This book may have been deleted or is no longer available." : "Unable to load this book. Check your connection and try again."}
        action={loadError === 404 ? <Button render={<Link href="/books" />} nativeButton={false}>Open books</Button> : <Button type="button" className="mt-3 w-fit" onClick={() => setLoadKey((key) => key + 1)}>
            Try again
          </Button>}
      />
    );
  }

  if (!data) {
    return <LoadingState title="Loading flashcards" description="Loading this book and its cards." />;
  }

  return (
    <FlashcardBookView
      key={bookId}
      book={data.book}
      books={data.books}
      flashcards={data.flashcards}
      labels={data.labels}
      initialLabelIds={selectedLabelIds}
      initialLabelMode={selectedLabelMode}
    />
  );
}
