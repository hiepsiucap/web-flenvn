export type VocabularyBook = { id: string };

export type VocabularySearchInput = {
  word: string;
  language: 'en' | 'vi';
  context?: string;
  bookId?: string;
};

export async function runVocabularySearch<T>(
  input: VocabularySearchInput,
  books: VocabularyBook[],
  search: (input: VocabularySearchInput) => Promise<T>,
): Promise<T> {
  const word = input.word.trim();
  if (!word) throw new Error('Enter a word or phrase to search.');
  const selectedBook = input.bookId || books[0]?.id;
  return search({
    word,
    language: input.language,
    ...(input.context?.trim() ? { context: input.context.trim() } : {}),
    ...(selectedBook ? { bookId: selectedBook } : {}),
  });
}

export function buildFirstFollowUpMessage(
  search: { word: string; context?: string; answer: string },
  question: string,
): string {
  return [
    `I searched the word or phrase "${search.word}".`,
    search.context ? `Context: ${search.context}` : '',
    `Earlier explanation: ${search.answer}`,
    `Follow-up question: ${question.trim()}`,
    'Answer the follow-up question in the same English or Vietnamese learning context.',
  ].filter(Boolean).join('\n');
}
