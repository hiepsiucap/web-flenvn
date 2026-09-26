import assert from "node:assert/strict";
import test from "node:test";
import { listBookGroups } from "./book-hierarchy.ts";

test("groups multiple sub-books under a parent without changing direct card counts", () => {
  const books = [
    { id: "grammar", title: "Grammar", parentBookId: "english", totalCards: 3 },
    { id: "english", title: "English", parentBookId: null, totalCards: 5 },
    { id: "japanese", title: "Japanese", parentBookId: null, totalCards: 2 },
    { id: "reading", title: "Reading", parentBookId: "english", totalCards: 4 },
  ];

  assert.deepEqual(
    listBookGroups(books).map(({ book, subBooks }) => ({
      id: book.id,
      directCards: book.totalCards,
      children: subBooks.map((child) => child.id),
    })),
    [
      { id: "english", directCards: 5, children: ["grammar", "reading"] },
      { id: "japanese", directCards: 2, children: [] },
    ]
  );
});
