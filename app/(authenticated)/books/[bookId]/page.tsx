"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { FlashcardBookView } from "@/components/flashcards/flashcard-book-view";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [loadError, setLoadError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => {
      setLoadError(false);
      void Promise.all([
        getBookClient(bookId),
        getBooksClient(),
        getFlashcardsByBookClient(bookId),
        getLabelsClient(true),
      ]).then(([book, books, flashcards, labels]) => {
        if (active) setData({ book, books, flashcards, labels });
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

  if (loadError && !data) {
    return (
      <Card className="max-w-3xl rounded-3xl">
        <CardHeader>
          <CardTitle>Book unavailable</CardTitle>
          <CardDescription>Unable to load this book. Check your connection and try again.</CardDescription>
          <Button type="button" className="mt-3 w-fit" onClick={() => setLoadKey((key) => key + 1)}>
            Try again
          </Button>
        </CardHeader>
      </Card>
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
