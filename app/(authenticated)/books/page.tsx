"use client";

import { useEffect, useMemo, useState } from "react";
import { Books as Library, ListBullets, MagnifyingGlass, SquaresFour } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Text } from "@/components/ui/text";
import { BooksGrid } from "@/components/books/books-grid";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { CLIENT_DATA_CHANGED_EVENT, getBooksClient } from "@/lib/client-api";
import type { Book } from "@/lib/dashboard-data";
import { listBookGroups } from "@/lib/book-hierarchy";

type BookSort = "newest" | "title-asc" | "title-desc";
type BookView = "grid" | "list";

export default function BooksPage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<BookSort>("newest");
  const [viewMode, setViewMode] = useState<BookView>("grid");

  useEffect(() => {
    let active = true;
    const load = () => {
      setLoadError(false);
      void getBooksClient().then((data) => {
        if (active) setBooks(data);
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
  }, [loadKey]);

  const visibleBooks = useMemo(() => {
    if (!books) return [];

    const topLevelBooks = listBookGroups(books).map(({ book }) => book);
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? topLevelBooks.filter((book) =>
          [book.title, book.description].some((value) => value?.toLowerCase().includes(query))
        )
      : topLevelBooks;

    if (sortOrder === "newest") return filtered;
    return [...filtered].sort((left, right) => {
      const comparison = left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
      return sortOrder === "title-asc" ? comparison : -comparison;
    });
  }, [books, searchQuery, sortOrder]);

  if (loadError && !books) {
    return (
      <Card className="max-w-3xl rounded-3xl">
        <CardHeader>
          <CardTitle>Books unavailable</CardTitle>
          <CardDescription>Unable to load your books. Check your connection and try again.</CardDescription>
          <Button type="button" className="mt-3 w-fit" onClick={() => setLoadKey((key) => key + 1)}>
            Try again
          </Button>
        </CardHeader>
      </Card>
    );
  }

  if (!books) {
    return <LoadingState title="Loading books" description="Loading your vocabulary library." />;
  }

  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <section className="flex items-start justify-between gap-4">
        <div>
          <Text as="div" size="2xl" weight="semibold">
            Books
          </Text>
          <Text className="mt-2" size="sm" tone="muted">
            Choose a book to review its flashcards.
          </Text>
        </div>
        {books.length ? <CreateBookDialog books={books} triggerClassName="shrink-0" /> : null}
      </section>

      {books.length > 0 ? (
        <>
          <section className="grid gap-4" aria-label="Book controls">
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
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search books..."
                  aria-label="Search books"
                  className="h-11 rounded-full bg-card pl-10 pr-4 shadow-none"
                />
              </div>
              <div className="inline-flex shrink-0 rounded-2xl border border-border bg-card p-0.5" aria-label="Book view">
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon-lg"
                  className="rounded-xl"
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                >
                  <Icon icon={SquaresFour} />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon-lg"
                  className="rounded-xl"
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                >
                  <Icon icon={ListBullets} />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Badge variant="secondary" className="h-9 w-fit rounded-2xl px-4">
                <Icon icon={Library} className="text-primary" />
                {visibleBooks.length} {visibleBooks.length === 1 ? "book" : "books"}
              </Badge>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder((value ?? "newest") as BookSort)}>
                <SelectTrigger className="h-9 rounded-full bg-card px-4">
                  {sortOrder === "newest" ? "Sort: Newest" : sortOrder === "title-asc" ? "Sort: A-Z" : "Sort: Z-A"}
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="title-asc">Title: A-Z</SelectItem>
                  <SelectItem value="title-desc">Title: Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {visibleBooks.length ? (
            <BooksGrid books={books} visibleBooks={visibleBooks} view={viewMode} />
          ) : (
            <EmptyState
              title="No matching books"
              description="Try a different search term."
              action={<Button type="button" variant="outline" onClick={() => setSearchQuery("")}>Clear search</Button>}
            />
          )}
        </>
      ) : (
        <EmptyState
          title="No books yet"
          description="Create a book to start building flashcards."
          action={<CreateBookDialog books={books} />}
        />
      )}
    </div>
  );
}
