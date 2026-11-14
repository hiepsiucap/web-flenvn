"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  GameController,
  SlidersHorizontal,
  ListBullets,
  MagnifyingGlass,
  SquaresFour,
} from "@phosphor-icons/react";

import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { EditBookDialog } from "@/components/books/edit-book-dialog";
import { CreateFlashcardDialog } from "@/components/flashcards/create-flashcard-dialog";
import { FlashcardGrid } from "@/components/flashcards/flashcard-grid";
import { LabelFilter } from "@/components/flashcards/labels/label-filter";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import type {
  Book,
  Flashcard,
  LabelCatalogItem,
  LabelFilterMode,
} from "@/lib/dashboard-data";

const PAGE_SIZE = 12;
type SortOrder = "newest" | "word-asc" | "word-desc";
type ViewMode = "grid" | "list";

export function FlashcardBookView({
  book,
  books,
  flashcards,
  labels,
  initialLabelIds,
  initialLabelMode,
  initialSearchQuery = "",
}: {
  book: Book | null;
  books: Book[];
  flashcards: Flashcard[];
  labels: LabelCatalogItem[];
  initialLabelIds: string[];
  initialLabelMode: LabelFilterMode;
  initialSearchQuery?: string;
}) {
  const [selectedLabelIds, setSelectedLabelIds] = useState(initialLabelIds);
  const [labelMode, setLabelMode] = useState(initialLabelMode);
  const [filtersOpen, setFiltersOpen] = useState(initialLabelIds.length > 0);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
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

  const sortedFlashcards = useMemo(() => {
    if (sortOrder === "newest") return filteredFlashcards;

    return [...filteredFlashcards].sort((left, right) => {
      const comparison = left.word.localeCompare(right.word, undefined, { sensitivity: "base" });
      return sortOrder === "word-asc" ? comparison : -comparison;
    });
  }, [filteredFlashcards, sortOrder]);

  const visibleFlashcards = sortedFlashcards.slice(0, visibleCount);
  const hasMoreFlashcards = visibleCount < sortedFlashcards.length;

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement || !hasMoreFlashcards) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, sortedFlashcards.length));
        }
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(loadMoreElement);
    return () => observer.disconnect();
  }, [hasMoreFlashcards, sortedFlashcards.length, visibleCount]);

  function updateFilters(ids: string[], mode: LabelFilterMode) {
    setSelectedLabelIds(ids);
    setLabelMode(mode);
    setVisibleCount(PAGE_SIZE);

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
    <div className="grid w-full gap-3 pb-20 sm:gap-4 lg:pb-0">
      <section className="flex min-w-0 items-center gap-2">
        <Button
          render={<Link href={parentBook ? `/books/${encodeURIComponent(parentBook.id)}` : "/books"} />}
          nativeButton={false}
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
        >
          <Icon icon={ArrowLeft} />
          <span className="sr-only">{parentBook ? parentBook.title : "Books"}</span>
        </Button>
        {book?.coverImage ? (
          <span
            className="hidden size-8 shrink-0 rounded-lg bg-card bg-cover bg-center sm:block"
            style={{ backgroundImage: `url(${book.coverImage})` }}
            aria-hidden="true"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {parentBook ? (
            <Link href={`/books/${encodeURIComponent(parentBook.id)}`} className="block truncate text-xs text-muted-foreground hover:text-foreground">
              {parentBook.title} / Sub-book
            </Link>
          ) : null}
          <h1 className="truncate text-base font-semibold sm:text-xl" title={book?.title ?? "Selected book"}>
            {book?.title ?? "Selected book"}
          </h1>
          {book?.description ? (
            <p className="hidden truncate text-xs text-muted-foreground sm:block" title={book.description}>{book.description}</p>
          ) : null}
        </div>
        {book && isOwnedBook ? (
          <CreateFlashcardDialog books={books} defaultBookId={book.id} triggerLabel="Add card" triggerClassName="h-9 shrink-0 rounded-full px-3" />
        ) : null}
      </section>

      <section
        aria-label="Flashcard controls"
        className="sticky top-0 z-30 -mx-4 grid gap-2 bg-background px-4 pb-2 pt-[calc(env(safe-area-inset-top)+.5rem)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Icon
              icon={MagnifyingGlass}
              size="sm"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Search cards…"
              aria-label="Search flashcards"
              className="h-10 rounded-full bg-card py-1 pl-10 pr-4 shadow-none dark:bg-card"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {book ? (
              <Button
                render={<Link href={`/flip-flashcards?bookId=${encodeURIComponent(book.id)}`} />}
                nativeButton={false}
                size="icon-lg"
                className="size-10"
                aria-label={`Play ${book.title}`}
                title="Play flashcards"
              >
                <Icon icon={GameController} />
              </Button>
            ) : null}
            {book && isOwnedBook ? (
              <EditBookDialog book={book} books={books} />
            ) : null}
            <Button
              type="button"
              variant={selectedLabelIds.length || sortOrder !== "newest" ? "secondary" : "outline"}
              size="sm"
              className="h-10 gap-1.5 px-3"
              aria-label={selectedLabelIds.length ? `Filters (${selectedLabelIds.length} selected)` : "Filters"}
              aria-expanded={filtersOpen}
              aria-controls="flashcard-filter-options"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Icon icon={SlidersHorizontal} />
              <span className="hidden sm:inline">Filters</span>
              {selectedLabelIds.length ? <span>{selectedLabelIds.length}</span> : null}
            </Button>
          </div>
        </div>
        {filtersOpen ? (
          <div id="flashcard-filter-options" className="flex flex-wrap items-center gap-2">
            <LabelFilter
              labels={labels}
              selectedIds={selectedLabelIds}
              mode={labelMode}
              onChange={updateFilters}
            />
            <Select value={sortOrder} onValueChange={(value) => {
              setSortOrder((value ?? "newest") as SortOrder);
              setVisibleCount(PAGE_SIZE);
            }}>
              <SelectTrigger className="h-9 rounded-full bg-card px-4 dark:bg-card">
                {sortOrder === "newest" ? "Sort: Newest" : sortOrder === "word-asc" ? "Sort: A-Z" : "Sort: Z-A"}
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="word-asc">Word: A-Z</SelectItem>
                <SelectItem value="word-desc">Word: Z-A</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto inline-flex rounded-full bg-card p-0.5" aria-label="Flashcard view">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon-sm"
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
              >
                <Icon icon={SquaresFour} />
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon-sm"
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
              >
                <Icon icon={ListBullets} />
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {book && !book.parentBookId && isOwnedBook ? (subBooks.length ? (
        <section aria-labelledby="sub-books-title" className="grid gap-3">
          <h2 id="sub-books-title">
            <Text as="span" size="lg" weight="semibold">
              Sub-books <span className="text-muted-foreground">({subBooks.length})</span>
            </Text>
          </h2>
          <div className="-mx-1 flex flex-nowrap items-stretch gap-2 overflow-x-auto px-1 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {subBooks.map((child) => (
              <Link
                key={child.id}
                href={`/books/${encodeURIComponent(child.id)}`}
                className="flex min-w-48 shrink-0 items-center gap-3 rounded-3xl bg-card p-2 pr-4 shadow-sm shadow-foreground/5 transition-shadow hover:shadow-md hover:shadow-foreground/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-border focus-visible:ring-offset-2"
              >
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-primary">
                  {child.coverImage ? (
                    <span
                      className="size-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${child.coverImage})` }}
                    />
                  ) : (
                    <Icon icon={BookOpen} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{child.title}</span>
                  <span className="block text-xs text-muted-foreground">{child.totalCards ?? 0} cards</span>
                </span>
              </Link>
            ))}
            <CreateBookDialog
              books={books}
              defaultParentBookId={book.id}
              triggerLabel="Add sub-book"
              triggerClassName="h-auto min-h-16 min-w-40 shrink-0 rounded-2xl border-0 bg-card px-5 hover:bg-muted"
            />
          </div>
        </section>
      ) : (
        <CreateBookDialog
          books={books}
          defaultParentBookId={book.id}
          triggerLabel="Add sub-book"
          triggerClassName="h-9 w-fit rounded-full border-0 bg-card px-4 hover:bg-muted"
        />
      )) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2>
          <Text as="span" size="lg" weight="semibold">
            Flashcards <span className="text-muted-foreground">({sortedFlashcards.length})</span>
          </Text>
        </h2>
        {sortedFlashcards.length ? (
          <Text size="xs" tone="muted">
            Showing {visibleFlashcards.length} of {sortedFlashcards.length}
          </Text>
        ) : null}
      </div>

      {visibleFlashcards.length ? (
        <FlashcardGrid
          key={`${viewMode}:${visibleFlashcards.map((card) => card.id).join(",")}`}
          flashcards={visibleFlashcards}
          books={books}
          labels={labels}
          view={viewMode}
        />
      ) : (
        <EmptyState
          illustration={selectedLabelIds.length || searchQuery ? "search" : "books"}
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

      {hasMoreFlashcards ? (
        <div ref={loadMoreRef} className="flex h-8 items-center justify-center" aria-hidden="true">
          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50" />
        </div>
      ) : null}
    </div>
  );
}
