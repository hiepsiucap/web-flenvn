"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, MagnifyingGlass } from "@phosphor-icons/react";

import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { CreateFlashcardDialog } from "@/components/flashcards/create-flashcard-dialog";
import { FlashcardGrid } from "@/components/flashcards/flashcard-grid";
import { LabelFilter } from "@/components/flashcards/labels/label-filter";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type {
  Book,
  Flashcard,
  LabelCatalogItem,
  LabelFilterMode,
} from "@/lib/dashboard-data";

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
  const [searchQuery, setSearchQuery] = useState("");
  const parentBook = books.find((item) => item.id === book?.parentBookId);
  const subBooks = books.filter((item) => item.parentBookId === book?.id);
  const isOwnedBook = books.some((item) => item.id === book?.id);

  const filteredFlashcards = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return flashcards.filter((card) => {
      const cardLabelIds = new Set(card.labels?.map((label) => label.id) ?? []);
      const matchesLabels = !selectedLabelIds.length || (labelMode === "all"
        ? selectedLabelIds.every((id) => cardLabelIds.has(id))
        : selectedLabelIds.some((id) => cardLabelIds.has(id)));
      const matchesSearch = !normalizedQuery || [
        card.word,
        card.partOfSpeech,
        card.pronunciation,
        card.definition,
        card.translation,
        card.example,
        card.exampleTranslation,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));

      return matchesLabels && matchesSearch;
    });
  }, [flashcards, labelMode, searchQuery, selectedLabelIds]);

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
        <div className="flex min-w-0 flex-1 items-start gap-3">
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
          <div className="min-w-0 flex-1">
            {parentBook ? (
              <Link
                href={`/books/${encodeURIComponent(parentBook.id)}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {parentBook.title} / Sub-book
              </Link>
            ) : null}
            <Text as="div" className="break-words" size="3xl" weight="semibold">
              {book?.title ?? "Selected book"}
            </Text>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-md">
                <Icon
                  icon={MagnifyingGlass}
                  size="sm"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search flashcards"
                  aria-label="Search flashcards"
                  className="h-9 rounded-full border-0 bg-card py-0.5 pl-10 pr-4 shadow-none dark:bg-card"
                />
              </div>
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
          {flashcards.length || selectedLabelIds.length ? (
            <CreateFlashcardDialog books={books} defaultBookId={book?.id} />
          ) : null}
        </div>
      </section>

      {book && !book.parentBookId && isOwnedBook ? (
        <section aria-labelledby="sub-books-title" className="grid gap-3">
          <h2 id="sub-books-title">
            <Text as="span" size="lg" weight="semibold">Sub-books</Text>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
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
            />
          </div>
        </section>
      ) : null}

      {subBooks.length ? (
        <h2><Text as="span" size="lg" weight="semibold">Flashcards</Text></h2>
      ) : null}

      {filteredFlashcards.length ? (
        <FlashcardGrid
          key={filteredFlashcards.map((card) => card.id).join(",")}
          flashcards={filteredFlashcards}
          books={books}
          labels={labels}
        />
      ) : (
        <EmptyState
          variant={subBooks.length ? "panel" : "page"}
          title={selectedLabelIds.length || searchQuery ? "No matching flashcards" : "No flashcards in this book"}
          description={selectedLabelIds.length || searchQuery
            ? "Try clearing or changing your search and filters."
            : "Add a card to start reviewing this book."}
          action={selectedLabelIds.length || searchQuery ? (
            <Button type="button" variant="outline" onClick={() => {
              setSearchQuery("");
              updateFilters([], "any");
            }}>Clear search and filters</Button>
          ) : (
            <CreateFlashcardDialog books={books} defaultBookId={book?.id} />
          )}
        />
      )}
    </div>
  );
}
