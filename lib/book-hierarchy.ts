type HierarchicalBook = { id: string; parentBookId?: string | null };

export function listBookGroups<T extends HierarchicalBook>(books: T[]) {
  const children = new Map<string, T[]>();
  for (const book of books) {
    if (book.parentBookId) {
      const siblings = children.get(book.parentBookId) ?? [];
      siblings.push(book);
      children.set(book.parentBookId, siblings);
    }
  }

  return books
    .filter((book) => !book.parentBookId)
    .map((book) => ({ book, subBooks: children.get(book.id) ?? [] }));
}
