const STORAGE_KEY = "flen:vocabulary-book-save-counts";

export function chooseSaveBook(
  books: { id: string }[],
  usage: Record<string, number>,
): string {
  let selected = books[0]?.id ?? "";
  for (const book of books) {
    if ((usage[book.id] ?? 0) > (usage[selected] ?? 0)) selected = book.id;
  }
  return selected;
}

export function readBookSaveCounts(): Record<string, number> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(([, count]) =>
        typeof count === "number" && Number.isSafeInteger(count) && count > 0,
      ),
    );
  } catch {
    return {};
  }
}

export function recordBookSave(bookId: string) {
  try {
    const counts = readBookSaveCounts();
    counts[bookId] = (counts[bookId] ?? 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Saving vocabulary must still succeed when browser storage is unavailable.
  }
}
