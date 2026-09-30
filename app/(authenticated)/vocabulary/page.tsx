import type { Metadata } from "next";

import { VocabularyChat } from "@/components/vocabulary/vocabulary-chat";

export const metadata: Metadata = {
  title: "Vocabulary chat",
  description: "Understand English and Vietnamese words in context and save them as flashcards.",
};

export default function VocabularyPage() {
  return <VocabularyChat />;
}
