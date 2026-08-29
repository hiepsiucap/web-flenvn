import Image from "next/image";
import { Books as Library } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { BooksGrid } from "@/components/books/books-grid";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { getBooks } from "@/lib/dashboard-data";
import emptyFolderImage from "@/img/empty-folder.png";

export default async function BooksPage() {
  const books = await getBooks();

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
          <CreateBookDialog />
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
              <CreateBookDialog />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
