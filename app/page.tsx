import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Cards,
  ChartLineUp,
  ChatsCircle,
  CheckCircle,
  GameController,
  Heart,
  Lightning,
  MagnifyingGlass,
  PencilSimple,
  PlayCircle,
  PlusCircle,
  Robot,
  ShieldCheck,
  SpeakerHigh,
  Sparkle,
  Star,
  Trophy,
} from "@phosphor-icons/react/ssr";

import { AuthModal } from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import hiwAi from "@/img/hiw-ai.png";
import hiwPenguin from "@/img/HIW-penguin.png";
import logo from "@/img/new-logo.png";
import trophyPenguin from "@/img/trophy-penguin.png";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Games", href: "#games" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "#blog" },
];

const highlights = [
  {
    title: "AI Search",
    description: "Instant meanings and examples",
    icon: BookOpen,
    className: "bg-blue-500",
  },
  {
    title: "Save & Review",
    description: "Organize and review anytime",
    icon: Cards,
    className: "bg-violet-500",
  },
  {
    title: "Fun Games",
    description: "Learn through quick challenges",
    icon: GameController,
    className: "bg-secondary text-secondary-foreground",
  },
];

const featureSections = [
  {
    title: "Word explanations that are easy to keep",
    description:
      "Search a word and save the useful parts: meaning, pronunciation, translation, examples, image, and audio.",
    icon: MagnifyingGlass,
    accent: "text-secondary",
    divider: "bg-secondary",
    scene: "search",
  },
  {
    title: "Books keep your vocabulary organized",
    description:
      "Create books for lessons, topics, exams, or personal reading so flashcards stay grouped by context.",
    icon: BookOpen,
    accent: "text-brand-300",
    divider: "bg-brand-300",
    scene: "books",
  },
  {
    title: "Review progress stays visible",
    description:
      "See due cards, accuracy, decks, and mastery from the dashboard before each study session.",
    icon: Cards,
    accent: "text-cyan-300",
    divider: "bg-cyan-300",
    scene: "progress",
  },
];

const featureBenefits = [
  {
    title: "Smart & Fast",
    description: "AI helps you learn faster",
    icon: Lightning,
    className: "bg-primary text-white",
  },
  {
    title: "Personalized",
    description: "Focus on the words you need",
    icon: ShieldCheck,
    className: "bg-brand-700 text-white",
  },
  {
    title: "Stay Motivated",
    description: "Games, streaks, and achievements",
    icon: Trophy,
    className: "bg-secondary text-secondary-foreground",
  },
  {
    title: "Learn Anywhere",
    description: "Sync across all your devices",
    icon: Heart,
    className: "bg-pink-500 text-white",
  },
];

const workflowSteps = [
  {
    title: "Create Your List",
    description: "Create a book for a class, topic, or reading list.",
    icon: PlusCircle,
    accent: "text-secondary",
    scene: "list",
  },
  {
    title: "Add & Discover Words",
    description: "Add words manually or use AI suggestions for definitions and examples.",
    icon: PencilSimple,
    accent: "text-brand-300",
    scene: "discover",
  },
  {
    title: "Review & Play",
    description: "Practice with review queues and quick vocabulary games.",
    icon: Trophy,
    accent: "text-secondary",
    scene: "review",
  },
];

const games = [
  {
    title: "Word Match",
    description: "Pair words with the right meaning before the timer runs out.",
  },
  {
    title: "Flash Review",
    description: "Flip cards, listen to audio, and mark what you remember.",
  },
  {
    title: "Quick Recall",
    description: "Practice active memory with short answer challenges.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_72%_12%,var(--landing-blue-highlight),transparent_28%),radial-gradient(circle_at_12%_52%,rgba(115,126,250,0.22),transparent_30%),linear-gradient(180deg,var(--landing-blue-start)_0%,var(--landing-blue-mid)_42%,var(--landing-blue-end)_100%)] text-white">
      <section className="relative min-h-screen px-6 py-7 sm:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto max-w-page-lg">
        <header className="relative z-10 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Image
              src={logo}
              alt="FLENVN logo"
              className="size-12 sm:size-14"
              priority
            />
            <Text
              as="div"
              className="text-xl font-extrabold tracking-normal sm:text-2xl"
              tone="inverse"
            >
              FLENVN
            </Text>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-bold text-white/90 lg:flex">
            {navLinks.map((item) => (
              <a key={item.label} href={item.href} className="hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>

          <AuthModal defaultMode="register">
            <Button className="h-11 rounded-full bg-white px-6 text-sm font-extrabold text-blue-700 hover:bg-white/90 sm:h-12 sm:px-8">
              Get Started
              <Icon icon={ArrowRight} className="size-5" weight="bold" />
            </Button>
          </AuthModal>
        </header>

        <div className="relative z-10 grid min-h-[calc(100vh-6.5rem)] items-center gap-8 pb-8 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:pt-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-sm backdrop-blur">
              <Icon icon={Sparkle} className="text-secondary" weight="fill" />
              AI-Powered Flashcards
            </div>

            <Text
              as="div"
              className="mt-6 text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl lg:text-[3.5rem]"
              tone="inverse"
            >
              Learn Words.
              <br />
              Play Games.
              <br />
              <span className="text-secondary">Get Smarter</span> with AI.
            </Text>

            <Text
              className="mt-5 max-w-lg text-base text-white/78"
              leading="relaxed"
              tone="inverse"
            >
              Search any word, get clear explanations, save favorites, and
              master vocabulary through focused review.
            </Text>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <AuthModal defaultMode="register">
                <Button className="h-11 rounded-full bg-white px-6 text-sm font-extrabold text-blue-700 hover:bg-white/90 sm:h-12 sm:px-7">
                  Start Learning Now
                  <Icon icon={ArrowRight} className="size-5" weight="bold" />
                </Button>
              </AuthModal>
              <Button
                render={<a href="#features" />}
                nativeButton={false}
                className="h-11 rounded-full border border-white/25 bg-transparent px-6 text-sm font-bold text-white hover:bg-white/10 sm:h-12 sm:px-7"
              >
                <Icon icon={PlayCircle} className="size-7" weight="duotone" />
                See How It Works
              </Button>
            </div>

            <div className="mt-10 grid gap-5 text-white sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.title} className="flex items-center gap-4">
                  <div
                    className={`grid size-12 shrink-0 place-items-center rounded-2xl border border-white/20 ${item.className}`}
                  >
                    <Icon icon={item.icon} className="size-7" weight="duotone" />
                  </div>
                  <div>
                    <Text as="div" weight="bold" tone="inverse">
                      {item.title}
                    </Text>
                    <Text className="mt-1 text-white/75" size="sm" tone="inverse">
                      {item.description}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <HeroScene />
        </div>
        </div>
      </section>

      <section
        id="features"
        className="relative overflow-hidden border-t border-white/10 bg-transparent px-6 py-18 text-white sm:px-10 lg:px-16 xl:px-20"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_28%,var(--landing-blue-highlight),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(115,126,250,0.24),transparent_28%)]" />
        <div className="absolute -left-24 bottom-10 h-56 w-[560px] rounded-[50%] border border-brand-400/20" />
        <div className="absolute left-[24%] top-10 hidden h-[520px] w-[520px] rounded-[50%] border border-brand-400/10 lg:block" />

        <div className="relative mx-auto max-w-page-lg">
          <div className="grid gap-10 xl:grid-cols-[0.74fr_1.26fr] xl:items-center">
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-700/65 px-4 py-2 text-xs font-extrabold uppercase text-secondary shadow-lg shadow-blue-950/25">
                <Icon icon={Star} className="size-4" weight="fill" />
                Features
              </div>
              <Text
                as="div"
                className="mt-6 text-2xl font-extrabold leading-tight tracking-normal sm:text-3xl lg:text-[2.25rem]"
                tone="inverse"
                balance
              >
                Everything you need to build a useful vocabulary habit
              </Text>
              <Text
                className="mt-4 max-w-lg text-sm text-white/72"
                tone="inverse"
                leading="relaxed"
              >
                FLENVN keeps the product focused: find words, save what matters,
                and review them in a rhythm that is easy to return to.
              </Text>
              <FeatureMascot />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {featureSections.map((item, index) => (
                <FeatureCard key={item.title} feature={item} number={index + 1} />
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-blue-950/20 backdrop-blur">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featureBenefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex items-center gap-4 border-white/10 xl:border-r xl:last:border-r-0"
                >
                  <div
                    className={`grid size-14 shrink-0 place-items-center rounded-full shadow-lg shadow-blue-950/25 ${benefit.className}`}
                  >
                    <Icon icon={benefit.icon} className="size-7" weight="fill" />
                  </div>
                  <div>
                    <Text as="div" className="text-sm font-extrabold" tone="inverse">
                      {benefit.title}
                    </Text>
                    <Text className="mt-1 text-xs text-white/72" tone="inverse">
                      {benefit.description}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="relative overflow-hidden border-t border-white/10 bg-transparent px-6 py-18 text-white sm:px-10 lg:px-16 xl:px-20"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,var(--landing-blue-highlight),transparent_22%),radial-gradient(circle_at_84%_42%,rgba(115,126,250,0.28),transparent_28%)]" />
        <div className="absolute left-10 top-14 hidden grid-cols-5 gap-3 opacity-30 lg:grid">
          {Array.from({ length: 15 }).map((_, index) => (
            <span key={index} className="size-2 rounded-full bg-brand-400" />
          ))}
        </div>
        <div className="absolute right-10 bottom-10 hidden grid-cols-5 gap-3 opacity-25 lg:grid">
          {Array.from({ length: 15 }).map((_, index) => (
            <span key={index} className="size-2 rounded-full bg-brand-400" />
          ))}
        </div>
        <div className="absolute -right-20 top-8 hidden h-80 w-[520px] rounded-[50%] border border-brand-400/25 lg:block" />
        <Icon
          icon={Sparkle}
          className="absolute left-[10%] top-32 hidden size-8 text-brand-400/70 lg:block"
          weight="fill"
        />
        <Icon
          icon={Sparkle}
          className="absolute right-[9%] top-28 hidden size-8 text-brand-400/70 lg:block"
          weight="fill"
        />

        <div className="relative mx-auto max-w-page-md">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-brand-400/25 bg-brand-700/65 px-5 py-2 text-xs font-extrabold uppercase text-secondary shadow-lg shadow-blue-950/25">
              <Icon icon={Sparkle} className="size-4 text-brand-300" weight="fill" />
              How it works
              <Icon icon={Sparkle} className="size-4 text-brand-300" weight="fill" />
            </div>
            <Text
              as="div"
              className="mt-5 text-2xl font-extrabold leading-tight tracking-normal sm:text-3xl lg:text-[2.35rem]"
              tone="inverse"
              balance
            >
              From a new word to a{" "}
              <span className="text-secondary">review habit</span>
            </Text>
            <Text className="mt-3 text-base text-white/72" tone="inverse">
              Learn smarter in 3 simple steps.
            </Text>
          </div>

          <div className="relative mt-10 grid gap-6 lg:grid-cols-3 lg:gap-24">
            <div className="absolute left-[25%] right-[25%] top-1/2 hidden -translate-y-1/2 border-t-4 border-dotted border-brand-400/60 lg:block" />
            {workflowSteps.map((step, index) => (
              <WorkflowCard key={step.title} step={step} number={index + 1} />
            ))}
          </div>
        </div>
      </section>

      <section
        id="games"
        className="border-t border-white/10 bg-transparent px-6 py-18 text-white sm:px-10 lg:px-16 xl:px-20"
      >
        <div className="mx-auto grid max-w-page-sm gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <Text as="div" className="text-sm font-bold uppercase text-secondary">
              Games
            </Text>
            <Text as="div" className="mt-3 text-3xl font-extrabold" tone="inverse">
              Make review feel less heavy
            </Text>
            <Text className="mt-4 max-w-lg text-white/72" tone="inverse" leading="relaxed">
              Games help learners repeat vocabulary without staring at the same
              list forever. Keep practice short, direct, and easy to finish.
            </Text>
          </div>

          <div className="grid gap-3">
            {games.map((game) => (
              <article
                key={game.title}
                className="flex gap-4 rounded-2xl border border-white/15 bg-white/10 p-5"
              >
                <Icon
                  icon={GameController}
                  className="size-8 shrink-0 text-secondary"
                  weight="duotone"
                />
                <div>
                  <Text as="div" weight="bold" tone="inverse">
                    {game.title}
                  </Text>
                  <Text className="mt-1 text-white/70" size="sm" tone="inverse">
                    {game.description}
                  </Text>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="border-t border-white/10 bg-transparent px-6 py-18 text-white sm:px-10 lg:px-16 xl:px-20"
      >
        <div className="mx-auto grid max-w-page-sm items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Text as="div" className="text-sm font-bold uppercase text-secondary">
              Pricing
            </Text>
            <Text as="div" className="mt-3 text-3xl font-extrabold" tone="inverse">
              Start simple, grow when you need more
            </Text>
            <Text className="mt-4 max-w-lg text-white/72" tone="inverse" leading="relaxed">
              Keep the first version approachable for learners. Add paid limits
              later for larger libraries, more AI usage, or classroom tools.
            </Text>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/15 bg-white p-6 text-blue-950">
              <Text as="div" className="text-xl" weight="bold">
                Free
              </Text>
              <Text className="mt-2" size="sm" tone="muted">
                Build books, create cards, and review vocabulary.
              </Text>
              <Text as="div" className="mt-5 text-3xl font-extrabold">
                $0
              </Text>
            </article>
            <article className="rounded-2xl border border-secondary bg-secondary p-6 text-secondary-foreground">
              <Text as="div" className="text-xl" weight="bold">
                Plus
              </Text>
              <Text className="mt-2" size="sm" tone="muted">
                More AI suggestions, richer media, and advanced progress tools.
              </Text>
              <Text as="div" className="mt-5 text-3xl font-extrabold">
                Coming soon
              </Text>
            </article>
          </div>
        </div>
      </section>

      <section
        id="blog"
        className="border-t border-white/10 bg-transparent px-6 py-18 text-white sm:px-10 lg:px-16 xl:px-20"
      >
        <div className="mx-auto max-w-page-sm">
          <div className="flex flex-col gap-6 rounded-3xl border border-white/15 bg-landing-blue-surface p-8 text-white md:flex-row md:items-center md:justify-between">
            <div>
              <Text as="div" className="text-sm font-bold uppercase text-secondary">
                Blog
              </Text>
              <Text as="div" className="mt-3 text-3xl font-extrabold" tone="inverse">
                Study notes, vocabulary tips, and product updates
              </Text>
              <Text className="mt-3 max-w-2xl text-white/75" tone="inverse">
                Share learning methods, game updates, and practical English
                vocabulary guides for Vietnamese learners.
              </Text>
            </div>
            <AuthModal defaultMode="register">
              <Button className="h-12 rounded-full bg-white px-7 font-extrabold text-blue-700 hover:bg-white/90">
                Start now
                <Icon icon={Lightning} weight="duotone" />
              </Button>
            </AuthModal>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  feature,
  number,
}: {
  feature: (typeof featureSections)[number];
  number: number;
}) {
  const numberLabel = number.toString().padStart(2, "0");

  return (
    <Card className="min-h-[420px] border border-brand-400/40 bg-white/10 py-0 text-white shadow-2xl shadow-blue-950/20 backdrop-blur">
      <CardContent className="flex h-full flex-col px-7 pb-7 pt-7">
        <div
          className={`grid size-12 place-items-center rounded-full text-base font-extrabold shadow-lg shadow-blue-950/25 ${
            number === 1
              ? "bg-secondary text-secondary-foreground"
              : number === 2
                ? "bg-brand-300 text-blue-950"
                : "bg-cyan-300 text-blue-950"
          }`}
        >
          {numberLabel}
        </div>

        <FeatureIllustration scene={feature.scene} accent={feature.accent} />

        <Text
          as="div"
          className="mt-auto text-xl font-extrabold leading-tight tracking-normal"
          tone="inverse"
          balance
        >
          {feature.title}
        </Text>
        <div className={`mt-4 h-0.5 w-12 rounded-full ${feature.divider}`} />
        <Text className="mt-4 text-sm text-white/76" tone="inverse" leading="relaxed">
          {feature.description}
        </Text>
        <div className="mt-5 grid size-11 place-items-center self-center rounded-full bg-primary/65 text-secondary shadow-lg shadow-blue-950/25">
          <Icon icon={ArrowRight} className={`size-6 ${feature.accent}`} weight="bold" />
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureIllustration({
  scene,
  accent,
}: {
  scene: string;
  accent: string;
}) {
  if (scene === "books") {
    return (
      <div className="relative my-2 h-42">
        <div className="absolute left-10 top-17 h-9 w-30 -rotate-6 rounded-lg bg-brand-700 shadow-xl shadow-blue-950/30" />
        <div className="absolute left-12 top-24 h-9 w-31 -rotate-6 rounded-lg bg-brand-300 shadow-xl shadow-blue-950/30" />
        <div className="absolute left-15 top-30 h-9 w-28 -rotate-6 rounded-lg bg-secondary shadow-xl shadow-blue-950/30" />
        <div className="absolute left-20 top-20 h-8 w-3 rounded-b-sm bg-secondary" />
        <div className="absolute left-25 top-28 h-8 w-3 rounded-b-sm bg-secondary" />
        <div className="absolute right-6 top-4 h-28 w-25 rotate-7 rounded-lg bg-white p-5 shadow-xl shadow-blue-950/30">
          <Icon icon={Star} className="mx-auto size-12 text-brand-700" weight="fill" />
          <div className="mt-4 h-2 w-15 rounded-full bg-brand-100" />
          <div className="mt-2 h-2 w-11 rounded-full bg-brand-100" />
        </div>
        <Icon
          icon={Star}
          className="absolute right-0 top-15 size-6 text-secondary"
          weight="fill"
        />
      </div>
    );
  }

  if (scene === "progress") {
    return (
      <div className="relative my-2 h-42">
        <div className="absolute left-12 top-12 h-26 w-40 -rotate-3 rounded-lg bg-white p-5 shadow-xl shadow-blue-950/30">
          <div className="h-2 w-22 rounded-full bg-brand-100" />
          <div className="relative mt-9 h-17">
            <div className="absolute bottom-2 left-0 right-0 h-1 rounded-full bg-brand-100" />
            <div className="absolute left-2 top-9 size-4 rounded-full bg-brand-700" />
            <div className="absolute left-15 top-3 size-4 rounded-full bg-brand-700" />
            <div className="absolute right-10 top-8 size-4 rounded-full bg-brand-700" />
            <div className="absolute right-2 top-0 size-4 rounded-full bg-brand-700" />
            <div className="absolute left-4 top-10 h-1 w-15 -rotate-35 rounded-full bg-brand-700" />
            <div className="absolute left-18 top-6 h-1 w-11 rotate-25 rounded-full bg-brand-700" />
            <div className="absolute right-8 top-6 h-1 w-10 -rotate-35 rounded-full bg-brand-700" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 grid size-14 place-items-center rounded-lg bg-primary text-white shadow-lg shadow-blue-950/30">
          <Icon icon={CheckCircle} className="size-9" weight="fill" />
        </div>
        <div className="absolute bottom-8 right-7 grid size-18 place-items-center rounded-full bg-brand-300 shadow-xl shadow-blue-950/30">
          <Icon icon={ChartLineUp} className="size-10 text-primary" weight="duotone" />
        </div>
        <Icon
          icon={Star}
          className="absolute right-1 top-20 size-6 text-secondary"
          weight="fill"
        />
      </div>
    );
  }

  return (
    <div className="relative my-2 h-42">
      <div className="absolute left-9 top-13 h-20 w-6 rotate-35 rounded-full bg-brand-700 shadow-xl shadow-blue-950/25" />
      <div className="absolute left-16 top-5 grid size-23 place-items-center rounded-full border-[10px] border-primary bg-transparent shadow-xl shadow-blue-950/30">
        <div className="size-11 rounded-full bg-brand-200" />
      </div>
      <div className="absolute right-10 top-12 h-26 w-31 rotate-[-4deg] rounded-lg bg-white p-5 shadow-xl shadow-blue-950/30">
        <Text as="div" className="text-3xl font-extrabold text-primary">
          Aa
        </Text>
        <div className="mt-4 h-2 w-20 rounded-full bg-brand-100" />
        <div className="mt-2 h-2 w-14 rounded-full bg-brand-100" />
      </div>
      <div className="absolute bottom-8 right-2 rounded-lg bg-secondary px-3 py-2 text-secondary-foreground shadow-lg shadow-blue-950/30">
        <Icon icon={ChatsCircle} className="size-7" weight="fill" />
      </div>
      <Icon
        icon={Star}
        className={`absolute right-9 top-3 size-5 ${accent}`}
        weight="fill"
      />
    </div>
  );
}

function FeatureMascot() {
  return (
    <div className="relative mt-8 hidden h-72 max-w-lg sm:block">
      <Image
        src={hiwPenguin}
        alt="Penguin learning vocabulary with flashcards"
        className="h-full w-full object-contain object-left"
        sizes="(min-width: 1280px) 480px, (min-width: 640px) 420px, 0px"
      />
    </div>
  );
}

function WorkflowCard({
  step,
  number,
}: {
  step: (typeof workflowSteps)[number];
  number: number;
}) {
  return (
    <Card className="relative z-10 min-h-[300px] border border-brand-400/35 bg-white/10 py-0 text-white shadow-2xl shadow-blue-950/20 backdrop-blur">
      <CardContent className="flex h-full flex-col items-center px-5 pb-7 pt-6 text-center sm:px-7">
        <div className="absolute left-6 top-6 grid size-12 place-items-center rounded-full border border-brand-300/60 bg-primary text-xl font-extrabold text-white shadow-lg shadow-brand-800/45">
          {number}
        </div>

        <WorkflowIllustration scene={step.scene} accent={step.accent} />

        <Text
          as="div"
          className="mt-5 text-xl font-extrabold leading-tight tracking-normal"
          tone="inverse"
        >
          {step.title}
        </Text>
        <Text
          className="mt-2 max-w-xs text-sm text-white/72"
          tone="inverse"
          leading="relaxed"
        >
          {step.description}
        </Text>
      </CardContent>
    </Card>
  );
}

function WorkflowIllustration({
  scene,
  accent,
}: {
  scene: string;
  accent: string;
}) {
  if (scene === "discover") {
    return (
      <div className="relative mt-3 h-34 w-72 max-w-full">
        <Image
          src={hiwAi}
          alt="Penguin discovering the word brilliant with AI"
          className="h-full w-full object-contain"
          sizes="288px"
        />
      </div>
    );
  }

  if (scene === "review") {
    return (
      <div className="relative mt-3 h-34 w-72 max-w-full">
        <Image
          src={trophyPenguin}
          alt="Penguin celebrating a successful vocabulary review"
          className="h-full w-full object-contain"
          sizes="288px"
        />
      </div>
    );
  }

  return (
    <div className="relative mt-3 h-34 w-72 max-w-full">
      <div className="absolute left-18 top-3 h-26 w-28 -rotate-6 rounded-xl bg-primary shadow-xl shadow-blue-950/35" />
      <div className="absolute left-24 top-0 h-25 w-32 rotate-[-8deg] rounded-lg bg-white p-4 shadow-xl shadow-blue-950/30">
        <div className="absolute left-3 top-0 h-12 w-4 rounded-b-sm bg-secondary" />
        <div className="ml-5 mt-2 h-3 w-20 rounded-full bg-primary" />
        <div className="ml-5 mt-4 h-3 w-18 rounded-full bg-primary" />
        <div className="ml-5 mt-4 h-3 w-14 rounded-full bg-primary" />
      </div>
      <div className="absolute right-12 top-16 grid size-16 rotate-6 place-items-center rounded-lg bg-white text-primary shadow-lg shadow-blue-950/30">
        <Icon icon={PlusCircle} className="size-10" weight="fill" />
      </div>
      <Icon
        icon={Star}
        className="absolute left-5 top-20 size-8 text-secondary"
        weight="fill"
      />
      <Icon
        icon={Cards}
        className={`absolute right-3 top-3 size-8 ${accent}`}
        weight="duotone"
      />
    </div>
  );
}

function HeroScene() {
  return (
    <div className="relative mx-auto hidden min-h-[560px] w-full max-w-3xl lg:block">
      <Image
        src={hiwPenguin}
        alt="Penguin learning vocabulary"
        className="pointer-events-none absolute right-4 top-8 h-[430px] w-[560px] object-contain"
        sizes="560px"
      />

      <div className="absolute left-8 top-14 h-[420px] w-[232px] rotate-[-10deg] rounded-[2rem] border-[8px] border-blue-500 bg-blue-700 shadow-2xl shadow-blue-950/50">
        <div className="absolute left-1/2 top-3 h-7 w-24 -translate-x-1/2 rounded-b-2xl bg-blue-950" />
        <div className="m-3 mt-10 rounded-[1.5rem] bg-white p-3 text-blue-950">
          <div className="flex h-11 items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-3 text-xs text-blue-900/70">
            Search any word...
            <Icon icon={MagnifyingGlass} className="size-7 text-blue-700" />
          </div>
          <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <Text as="div" className="text-xl font-extrabold text-blue-950">
                brilliant
              </Text>
              <Icon icon={SpeakerHigh} className="size-7 text-blue-700" />
            </div>
            <Text className="mt-2 text-blue-950/70" size="sm">
              /&apos;bril.yent/
            </Text>
            <Text className="mt-3 text-blue-950/70" size="sm">
              adjective
            </Text>
            <Text className="mt-3 text-blue-950" size="sm" weight="semibold">
              Exceptionally clever or talented.
            </Text>
            <div className="mt-5 border-t border-blue-100 pt-4">
              <Text className="text-blue-700" size="sm" weight="bold">
                Example
              </Text>
              <Text className="mt-1 text-blue-950" size="sm">
                She is a brilliant problem solver.
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-0 top-28 rounded-[1.5rem] border border-white/20 bg-white p-4 text-blue-950 shadow-xl shadow-blue-950/30">
        <div className="flex items-center gap-3">
          <Icon icon={Robot} className="size-8 text-blue-700" weight="duotone" />
          <Text as="div" className="text-lg font-extrabold text-blue-700">
            AI Explanation
          </Text>
        </div>
        <Text className="mt-3 max-w-56 text-blue-950" weight="semibold">
          Able to recover quickly from difficulties.
        </Text>
      </div>

      <div className="absolute right-42 top-[286px] rounded-3xl bg-white px-7 py-6 text-center text-blue-950 shadow-xl shadow-blue-950/30">
        <Text as="div" className="text-3xl font-extrabold text-blue-950">
          Happy
        </Text>
        <Icon icon={SpeakerHigh} className="mx-auto mt-3 size-7 text-blue-500" />
      </div>

      <div className="absolute bottom-12 right-32 rounded-3xl bg-blue-700 p-4 shadow-2xl shadow-blue-950/40">
        <Text as="div" className="text-center text-xl font-extrabold" tone="inverse">
          Word Match
        </Text>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {["ocean", "ocean"].map((word, index) => (
            <div
              key={`${word}-${index}`}
              className="grid h-20 w-24 place-items-center rounded-2xl bg-white text-lg font-extrabold text-blue-950"
            >
              {word}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 right-0 grid gap-3 text-center">
        <Icon icon={Star} className="mx-auto size-20 text-secondary" weight="fill" />
        <div className="rounded-2xl border border-blue-400 bg-blue-800 px-7 py-3 text-2xl font-extrabold text-secondary shadow-xl shadow-blue-950/30">
          +120 XP
        </div>
      </div>

      {[
        "left-[420px] top-16",
        "right-[280px] top-4",
        "right-[120px] top-16",
        "left-[360px] bottom-28",
        "right-[40px] bottom-60",
      ].map((position, index) => (
        <Icon
          key={position}
          icon={Star}
          weight="fill"
          className={`absolute size-8 text-secondary ${position} ${
            index % 2 ? "rotate-12" : "-rotate-12"
          }`}
        />
      ))}
    </div>
  );
}
