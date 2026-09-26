"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Stack as Layers3 } from "@phosphor-icons/react";

import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { CreateFlashcardDialog } from "@/components/flashcards/create-flashcard-dialog";
import { FlashcardGrid } from "@/components/flashcards/flashcard-grid";
import { LabelFilter } from "@/components/flashcards/labels/label-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type {
  Book,
  Flashcard,
  LabelCatalogItem,
  LabelFilterMode,
} from "@/lib/dashboard-data";
import emptyFolderImage from "@/img/empty-folder.png";

export function FlashcardBookView({
  book,
  books,
  flashcards,
  labels,
  initialLabelIds,
  initialLabelMode,
}: {
  book: Book | null;
  books: Book[];
  flashcards: Flashcard[];
  labels: LabelCatalogItem[];
  initialLabelIds: string[];
  initialLabelMode: LabelFilterMode;
}) {
  const [selectedLabelIds, setSelectedLabelIds] = useState(initialLabelIds);
  const [labelMode, setLabelMode] = useState(initialLabelMode);
  const parentBook = books.find((item) => item.id === book?.parentBookId);
  const subBooks = books.filter((item) => item.parentBookId === book?.id);
  const isOwnedBook = books.some((item) => item.id === book?.id);

  const filteredFlashcards = useMemo(() => {
    if (!selectedLabelIds.length) return flashcards;

    return flashcards.filter((card) => {
      const cardLabelIds = new Set(card.labels?.map((label) => label.id) ?? []);
      return labelMode === "all"
        ? selectedLabelIds.every((id) => cardLabelIds.has(id))
        : selectedLabelIds.some((id) => cardLabelIds.has(id));
    });
  }, [flashcards, labelMode, selectedLabelIds]);

  function updateFilters(ids: string[], mode: LabelFilterMode) {
    setSelectedLabelIds(ids);
    setLabelMode(mode);

    const url = new URL(window.location.href);
    if (ids.length) {
      url.searchParams.set("labelIds", ids.join(","));
      url.searchParams.set("labelMode", mode);
    } else {
      url.searchParams.delete("labelIds");
      url.searchParams.delete("labelMode");
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  return (
    <div className="grid w-full gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            render={<Link href={parentBook ? `/books/${encodeURIComponent(parentBook.id)}` : "/books"} />}
            nativeButton={false}
            variant="outline"
            size="icon-lg"
            className="mt-1 shrink-0 rounded-2xl"
          >
            <Icon icon={ArrowLeft} />
            <span className="sr-only">{parentBook ? parentBook.title : "Books"}</span>
          </Button>
          <div className="min-w-0">
            {parentBook ? (
              <Link
                href={`/books/${encodeURIComponent(parentBook.id)}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {parentBook.title} / Sub-book
              </Link>
            ) : null}
            <Text as="div" className="truncate" size="3xl" weight="semibold">
              {book?.title ?? "Selected book"}
            </Text>
            <div className="mt-3">
              <LabelFilter
                labels={labels}
                selectedIds={selectedLabelIds}
                mode={labelMode}
                onChange={updateFilters}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="h-8 w-fit rounded-2xl px-3">
            <Icon icon={Layers3} className="text-primary" />
            {subBooks.length ? `${filteredFlashcards.length} direct cards` : `${filteredFlashcards.length} cards`}
          </Badge>
          <CreateFlashcardDialog books={books} defaultBookId={book?.id} />
        </div>
      </section>

      {book && !book.parentBookId && isOwnedBook ? (
        <section aria-label="Sub-books" className="flex flex-wrap items-center gap-2">
          {subBooks.map((child) => (
            <Link
              key={child.id}
              href={`/books/${encodeURIComponent(child.id)}`}
              className="flex min-w-0 max-w-48 items-center gap-2 rounded-xl border border-border bg-card p-1 pr-3 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary text-primary">
                {child.coverImage ? (
                  <span
                    className="size-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${child.coverImage})` }}
                  />
                ) : (
                  <Icon icon={BookOpen} />
                )}
              </span>
              <span className="min-w-0 truncate text-sm font-medium">{child.title}</span>
            </Link>
          ))}
          <CreateBookDialog
            books={books}
            defaultParentBookId={book.id}
            triggerLabel="Add sub-book"
            iconOnly
          />
        </section>
      ) : null}

      {subBooks.length ? (
        <h2><Text as="span" size="lg" weight="semibold">Flashcards</Text></h2>
      ) : null}

      {filteredFlashcards.length ? (
        <FlashcardGrid
          key={filteredFlashcards.map((card) => card.id).join(",")}
          flashcards={filteredFlashcards}
          labels={labels}
        />
      ) : (
        <section className={`grid w-full place-items-center px-6 py-12 text-center ${subBooks.length ? "min-h-60" : "min-h-[calc(100vh-16rem)]"}`}>
          <div className="flex max-w-sm flex-col items-center">
            <Image src={emptyFolderImage} alt="" className="h-auto w-52" priority />
            <Text as="div" className="mt-6" size="xl" weight="semibold">
              {selectedLabelIds.length ? "No matching flashcards" : "No flashcards in this book"}
            </Text>
            <Text className="mt-2" size="sm" tone="muted">
              {selectedLabelIds.length
                ? "Try clearing or changing the selected label filters."
                : "Add your first card to start reviewing this book."}
            </Text>
            {!selectedLabelIds.length ? (
              <div className="mt-6 flex justify-center">
                <CreateFlashcardDialog books={books} defaultBookId={book?.id} />
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
