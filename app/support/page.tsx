import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChatCircleText,
  EnvelopeSimple,
  Question,
} from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import logo from "@/img/new-logo.png";

export const metadata: Metadata = {
  title: "Support | FLENVN",
  description: "Get help using FLENVN flashcards, books, and study tools.",
};

const supportOptions = [
  {
    title: "Getting started",
    description: "Learn how to create a book, add flashcards, and begin reviewing.",
    icon: BookOpen,
  },
  {
    title: "Account help",
    description: "Find help with signing in, expired sessions, and your profile.",
    icon: Question,
  },
  {
    title: "Report a problem",
    description: "Tell us what happened and include the page where you saw it.",
    icon: ChatCircleText,
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-page-sm items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="FLENVN home">
            <Image src={logo} alt="FLENVN logo" className="size-12" priority />
            <Text as="span" size="xl" weight="bold">
              FLENVN
            </Text>
          </Link>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="outline"
          >
            Sign in
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-page-sm px-5 py-12 sm:px-8 sm:py-16">
        <Button
          render={<Link href="/" />}
          nativeButton={false}
          variant="ghost"
          className="mb-8 -ml-3"
        >
          <Icon icon={ArrowLeft} />
          Back to home
        </Button>

        <section className="max-w-2xl">
          <Text as="div" size="3xl" weight="bold">
            How can we help?
          </Text>
          <Text className="mt-3 text-base leading-7" tone="muted">
            Find help with your books, flashcards, study sessions, or account.
            You can view this page without signing in.
          </Text>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {supportOptions.map((option) => (
            <Card key={option.title}>
              <CardHeader>
                <Icon icon={option.icon} className="mb-3 size-7 text-primary" />
                <CardTitle>{option.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text size="sm" tone="muted" leading="relaxed">
                  {option.description}
                </Text>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-12 border-t border-border pt-10">
          <Text as="div" size="2xl" weight="semibold">
            Still need help?
          </Text>
          <Text className="mt-2 max-w-xl" tone="muted">
            Send our support team a message with a short description of the issue.
          </Text>
          <Button className="mt-6" disabled>
            <Icon icon={EnvelopeSimple} />
            Support email coming soon
          </Button>
        </section>
      </div>
    </main>
  );
}
