export function buildBookEditPayload(title: string, coverImage?: string) {
  const trimmedTitle = title.trim();
  if (trimmedTitle.length < 3) {
    throw new Error("Book title must contain at least 3 characters.");
  }
  if (trimmedTitle.length > 255) {
    throw new Error("Book title must contain at most 255 characters.");
  }

  return coverImage === undefined
    ? { title: trimmedTitle }
    : { title: trimmedTitle, coverImage };
}
