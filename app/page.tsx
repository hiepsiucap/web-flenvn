import Image from "next/image";

import { LoginForm } from "@/components/auth/login-form";
import logo from "./logo.png";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex min-h-[44vh] flex-col justify-between bg-primary px-6 py-8 text-primary-foreground sm:px-10 lg:min-h-screen lg:px-14">
          <div className="flex items-center gap-4">
            <Image
              src={logo}
              alt="Flashcard app logo"
              className="size-16 rounded-2xl bg-white/95 p-2 shadow-lg shadow-black/10 sm:size-20"
              priority
            />
            <span className="text-xl font-semibold">FLEN</span>
          </div>

          <div className="max-w-xl py-10">
            <p className="text-sm font-medium uppercase text-brand-100">
              Study smarter
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              Pick up right where your flashcards left off.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-brand-100">
              Review decks, track progress, and keep your learning streak
              moving.
            </p>
          </div>

          <p className="text-sm text-brand-100">
            Your next review session is waiting.
          </p>
        </div>

        <div className="flex items-center justify-center px-6 py-10 sm:px-10">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
