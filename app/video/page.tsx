import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";

import { YouTubeEmbedForm } from "@/components/video/youtube-embed-form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import logo from "@/img/new-logo.png";

export const metadata: Metadata = {
  title: "YouTube Video Player",
  description: "Paste a YouTube link and watch the video on FLENVN.",
  alternates: {
    canonical: "/video",
  },
};

export default function VideoPage() {
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
          <Button render={<Link href="/" />} nativeButton={false} variant="outline">
            <Icon icon={ArrowLeft} />
            Home
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <section aria-labelledby="video-page-title">
          <h1 id="video-page-title" className="font-heading text-3xl font-bold tracking-tight">
            Watch a YouTube video
          </h1>
          <Text className="mt-3 max-w-2xl text-base leading-7" tone="muted">
            Paste a YouTube video link below. We’ll turn it into a responsive player that works on desktop and mobile.
          </Text>

          <div className="mt-8">
            <YouTubeEmbedForm />
          </div>
        </section>
      </div>
    </main>
  );
}
