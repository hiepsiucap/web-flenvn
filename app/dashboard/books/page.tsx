import { Library } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BooksGrid } from "@/components/books/books-grid";
import { CreateBookDialog } from "@/components/books/create-book-dialog";
import { getBooks } from "@/lib/dashboard-data";

export default async function BooksPage() {
  const books = await getBooks();

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Books</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a book to review its flashcards.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="h-8 w-fit rounded-2xl px-3">
            <Library className="size-4 text-primary" />
            {books.length} books
          </Badge>
          <CreateBookDialog />
        </div>
      </section>

      {books.length > 0 ? (
        <BooksGrid books={books} />
      ) : (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>No books yet</CardTitle>
            <CardDescription>
              Create or import a book to start building flashcards.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
