"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { FlashcardBookView } from "@/components/flashcards/flashcard-book-view";
import { CLIENT_DATA_CHANGED_EVENT, getBookClient, getBooksClient, getFlashcardsByBookClient, getLabelsClient } from "@/lib/client-api";
import type { Book, Flashcard, LabelCatalogItem, LabelFilterMode } from "@/lib/dashboard-data";

export default function FlashcardPage() {
  return (
    <Suspense fallback={<LoadingState title="Loading flashcards" description="Loading your books and cards." />}>
      <FlashcardPageContent />
    </Suspense>
  );
}

function FlashcardPageContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? undefined;
  const labelIds = searchParams.get("labelIds") ?? undefined;
  const labelMode = searchParams.get("labelMode") ?? undefined;
  const selectedLabelIds = [...new Set(labelIds?.split(",").filter(Boolean) ?? [])];
  const selectedLabelMode: LabelFilterMode = labelMode === "all" ? "all" : "any";
  const [data, setData] = useState<{
    book: Book | null;
    books: Book[];
    flashcards: Flashcard[];
    labels: LabelCatalogItem[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      void getBooksClient().then(async (books) => {
        const selectedBookId = bookId ?? books[0]?.id;
        if (!selectedBookId) {
          if (active) setData({ book: null, books, flashcards: [], labels: [] });
          return;
        }
        const [book, flashcards, labels] = await Promise.all([
          getBookClient(selectedBookId),
          getFlashcardsByBookClient(selectedBookId),
          getLabelsClient(true),
        ]);
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
    return <LoadingState title="Loading flashcards" description="Loading your books and cards." />;
  }

  const selectedBookId = data.book?.id;

  if (!selectedBookId) {
    return (
      <div className="grid w-full gap-6">
        <Button
          render={<Link href="/books" />}
          nativeButton={false}
          variant="outline"
          className="w-fit rounded-2xl"
        >
          <Icon icon={ArrowLeft} />
          Books
        </Button>
        <EmptyState
          title="No books yet"
          description="Create a book before adding flashcards."
          action={<CreateBookDialog />}
        />
      </div>
    );
  }

  return (
    <FlashcardBookView
      key={selectedBookId}
      book={data.book}
      books={data.books}
      flashcards={data.flashcards}
      labels={data.labels}
      initialLabelIds={selectedLabelIds}
      initialLabelMode={selectedLabelMode}
    />
  );
}
