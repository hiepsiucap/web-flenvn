"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Books as Library } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { BooksGrid } from "@/components/books/books-grid";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { CLIENT_DATA_CHANGED_EVENT, getBooksClient } from "@/lib/client-api";
import type { Book } from "@/lib/dashboard-data";
import emptyFolderImage from "@/img/empty-folder.png";

export default function BooksPage() {
  const [books, setBooks] = useState<Book[] | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      void getBooksClient().then((data) => {
        if (active) setBooks(data);
      }).catch(() => {
        if (active) setBooks([]);
      });
    };
    load();
    window.addEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(CLIENT_DATA_CHANGED_EVENT, load);
    };
  }, []);

  if (!books) {
    return <LoadingState title="Loading books" description="Loading your vocabulary library." />;
  }

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Text as="div" size="2xl" weight="semibold">
            Books
          </Text>
          <Text className="mt-2" size="sm" tone="muted">
            Choose a book to review its flashcards.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="h-8 w-fit rounded-2xl px-3">
            <Icon icon={Library} className="text-primary" />
            {books.length} books
          </Badge>
          <CreateBookDialog books={books} />
        </div>
      </section>

      {books.length > 0 ? (
        <BooksGrid books={books} />
      ) : (
        <section className="grid min-h-[520px] place-items-center px-6 py-12 text-center">
          <div className="flex max-w-sm flex-col items-center">
            <Image
              src={emptyFolderImage}
              alt=""
              className="h-auto w-52"
              priority
            />
            <Text as="div" className="mt-6" size="xl" weight="semibold">
              No books yet
            </Text>
            <Text className="mt-2" size="sm" tone="muted">
              Create or import a book to start building flashcards.
            </Text>
            <div className="mt-6 flex justify-center">
              <CreateBookDialog books={books} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
