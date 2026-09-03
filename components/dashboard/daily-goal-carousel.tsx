"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useStreak } from "@/components/streak/streak-provider";
import flashcardsImage from "@/img/daily-goal-flashcards.png";
import streakImage from "@/img/daily-goal-streak.png";
import trophyImage from "@/img/daily-goal-trophy.png";
import { cn } from "@/lib/utils";

const supportingSlides = [
  {
    label: "Build Your Streak",
    title: "Small steps add up!",
    description: "Study a little every day to grow your streak.",
    image: streakImage,
    imageAlt: "Bright study streak flame with a checkmark",
  },
  {
    label: "Master New Words",
    title: "Make every word stick!",
    description: "Keep reviewing to strengthen your memory.",
    image: flashcardsImage,
    imageAlt: "Colorful flashcards with a star",
  },
] as const;

export function DailyGoalCarousel() {
  const { status } = useStreak();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slides = [
    {
      label: "Daily Goal",
      title: status?.completedToday ? "Goal complete!" : `${status?.todayScore ?? 0} / ${status?.dailyTarget ?? 100} points`,
      description: status?.message ?? "Complete a learning session to start today’s goal.",
      image: trophyImage,
      imageAlt: "Golden trophy with colorful confetti",
    },
    ...supportingSlides,
  ];
  const slideCount = supportingSlides.length + 1;
  const activeSlide = slides[activeIndex];

  useEffect(() => {
    if (isPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slideCount);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [activeIndex, isPaused, slideCount]);

  return (
    <section
      className="mt-auto flex min-h-52 flex-col items-center pb-3.5 text-center text-sidebar-foreground"
      aria-label="Daily learning goals"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      <Separator className="mb-4" />
      <Link
        href="/review"
        className="flex w-full flex-1 flex-col items-center px-5 focus-visible:rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`${activeSlide.label}: ${activeSlide.description} Start reviewing.`}
      >
        <div
          className="grid h-20 place-items-center"
          aria-live={isPaused ? "polite" : "off"}
        >
          <Image
            src={activeSlide.image}
            alt={activeSlide.imageAlt}
            className="size-20 object-contain"
          />
        </div>
        <Text className="text-[11px] uppercase tracking-wider text-brand-700" weight="bold">
          {activeSlide.label}
        </Text>
        <Text
          as="div"
          className="mt-1.5 flex min-h-8 items-center text-xs font-extrabold tracking-normal"
        >
          {activeSlide.title}
        </Text>
        <Text
          className="mt-1 flex min-h-8 max-w-36 items-center text-[11px] leading-4"
          tone="muted"
        >
          {activeSlide.description}
        </Text>
      </Link>

      <div className="mt-3 flex items-center gap-1.5" aria-label="Choose a learning goal">
        {slides.map((slide, index) => (
          <button
            key={slide.label}
            type="button"
            className="grid size-5 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={`Show ${slide.label}`}
            aria-pressed={index === activeIndex}
            onClick={() => setActiveIndex(index)}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                index === activeIndex ? "bg-primary" : "bg-brand-200"
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
