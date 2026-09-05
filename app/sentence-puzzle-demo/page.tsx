"use client";

import { useState } from "react";
import { Fire, PuzzlePiece, Star, Target } from "@phosphor-icons/react";

import {
  SentencePuzzle,
  type SentencePuzzleFeedback,
} from "@/components/practice/sentence-puzzle";
import { PracticeEnergyProgress } from "@/components/practice/practice-energy-progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import { isCorrectSentence, type PuzzleToken } from "@/lib/practice-games";

const sentence =
  "The principle of honesty always guides her important decisions and helps everyone build trust at work every day.";
const sentenceWords = sentence.split(" ");
const shuffledOrder = [15, 0, 8, 17, 6, 1, 12, 4, 10, 2, 16, 7, 14, 5, 11, 3, 9, 13];
const tokens: PuzzleToken[] = shuffledOrder.map((wordIndex) => ({
  id: `word-${wordIndex}`,
  text: sentenceWords[wordIndex],
}));

export default function SentencePuzzleDemoPage() {
  const [feedback, setFeedback] = useState<SentencePuzzleFeedback | null>(null);
  const [round, setRound] = useState(0);
  const [xp, setXp] = useState(0);

  function checkSentence(answer: string) {
    const correct = isCorrectSentence(answer, sentence);
    setFeedback({ result: correct ? "correct" : "incorrect", canRetry: !correct });
    if (correct) setXp(100);
  }

  function resetDemo() {
    setRound((value) => value + 1);
    setFeedback(null);
    setXp(0);
  }

  return (
    <main className="min-h-screen bg-brand-50/50 px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-4">
        <section className="grid gap-2 rounded-2xl border border-brand-100 bg-card px-4 py-3 shadow-sm sm:px-5">
          <div className="flex items-center justify-between gap-4 text-sm font-bold sm:text-base">
            <span className="inline-flex min-w-0 items-center gap-2 text-primary">
              <Icon icon={Star} className="size-5 shrink-0 text-secondary" weight="fill" />
              <span className="truncate">Stage 6 of 23</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 font-extrabold text-primary">
              <Icon
                icon={Fire}
                className="size-5 origin-bottom animate-[practice-flame_900ms_ease-in-out_infinite] text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.55)] motion-reduce:animate-none"
                weight="fill"
              />
              {xp} XP
            </span>
          </div>
          <PracticeEnergyProgress progress={26} segments={23} />
        </section>

        <Card className="overflow-hidden rounded-2xl border border-brand-100 shadow-sm">
          <CardHeader className="h-28 px-5 sm:px-6">
            <div className="flex h-full min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-primary">
                  <Icon icon={Target} className="size-6" weight="fill" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="text-xl font-bold">Build the sentence</CardTitle>
                  <CardDescription className="mt-0.5 truncate">
                    Choose the words to make a correct sentence.
                  </CardDescription>
                  <Tag size="sm" variant="primary" className="mt-2">
                    noun
                  </Tag>
                </div>
              </div>
              <Tag
                variant="outline"
                className="shrink-0 text-primary"
                leadingIcon={<Icon icon={PuzzlePiece} size="sm" weight="fill" />}
              >
                Puzzle
              </Tag>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
            <SentencePuzzle
              key={round}
              tokens={tokens}
              correctSentence={sentence}
              translation="Nguyên tắc trung thực luôn định hướng những quyết định quan trọng của cô ấy và giúp mọi người xây dựng niềm tin tại nơi làm việc mỗi ngày."
              feedback={feedback}
              disabled={false}
              onEdit={() => {
                if (feedback?.canRetry) setFeedback(null);
              }}
              onSkip={resetDemo}
              onSubmit={checkSentence}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
