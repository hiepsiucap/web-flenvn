"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { FlashcardBookView } from "@/components/flashcards/flashcard-book-view";
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

  useEffect(() => {
    let active = true;
    const load = () => {
      void Promise.all([
        getBookClient(bookId),
        getBooksClient(),
        getFlashcardsByBookClient(bookId),
        getLabelsClient(true),
      ]).then(([book, books, flashcards, labels]) => {
        if (active) setData({ book, books, flashcards, labels });
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
