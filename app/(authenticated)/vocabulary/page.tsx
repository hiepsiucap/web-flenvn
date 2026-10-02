import type { Metadata } from "next";

import { VocabularyChat } from "@/components/vocabulary/vocabulary-chat";

export const metadata: Metadata = {
  title: "AI chat",
  description: "Chat with FLENVN's Gemini-powered English-learning assistant.",
};

export default function VocabularyPage() {
  return <VocabularyChat />;
}
