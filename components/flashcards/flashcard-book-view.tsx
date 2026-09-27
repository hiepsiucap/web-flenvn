"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  GameController,
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
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
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
    <div className="grid w-full gap-5 pb-20 sm:gap-6 lg:pb-0">
      <section className="grid gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button
            render={<Link href={parentBook ? `/books/${encodeURIComponent(parentBook.id)}` : "/books"} />}
            nativeButton={false}
            variant="outline"
            size="icon-lg"
            className="shrink-0 rounded-2xl"
          >
            <Icon icon={ArrowLeft} />
            <span className="sr-only">{parentBook ? parentBook.title : "Books"}</span>
          </Button>
            <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-primary">
              {book?.coverImage ? (
                <span
                  className="size-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${book.coverImage})` }}
                />
              ) : (
                <Icon icon={BookOpen} className="size-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {parentBook ? (
                <Link
                  href={`/books/${encodeURIComponent(parentBook.id)}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {parentBook.title} / Sub-book
                </Link>
              ) : null}
              <h1 className="min-w-0 max-w-full overflow-hidden">
                <Text
                  as="span"
                  className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl sm:text-3xl"
                  weight="semibold"
                  title={book?.title ?? "Selected book"}
                >
                  {book?.title ?? "Selected book"}
                </Text>
              </h1>
              {book?.description ? (
                <Text className="mt-1 max-w-full truncate" size="sm" tone="muted" title={book.description}>
                  {book.description}
                </Text>
              ) : null}
            </div>
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
              <EditBookDialog book={book} books={books} showLabel compactOnMobile />
            ) : null}
            {book && isOwnedBook ? (
              <div className="hidden sm:block">
                <CreateFlashcardDialog books={books} defaultBookId={book?.id} />
              </div>
            ) : null}
          </div>
        </div>

        {book && isOwnedBook ? (
          <div className="sm:hidden">
            <CreateFlashcardDialog
              books={books}
              defaultBookId={book.id}
              triggerClassName="w-full rounded-full"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
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
              placeholder="Search flashcards (e.g. API, database, cloud...)"
              aria-label="Search flashcards"
              className="h-11 rounded-full bg-card py-1 pl-10 pr-4 shadow-none sm:h-10 dark:bg-card"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="ml-auto inline-flex rounded-full border border-border bg-card p-0.5" aria-label="Flashcard view">
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
        </div>
      </section>

      {book && !book.parentBookId && isOwnedBook ? (
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
                className="flex min-w-48 shrink-0 items-center gap-3 rounded-2xl border border-border bg-card p-2 pr-4 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
              triggerClassName="h-auto min-h-16 min-w-40 shrink-0 rounded-2xl px-5"
            />
          </div>
        </section>
      ) : null}

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
