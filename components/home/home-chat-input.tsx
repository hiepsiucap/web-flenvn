"use client";

import { ArrowUpRight, MagnifyingGlass, Sparkle } from "@phosphor-icons/react";
import Image from "next/image";
import penguin from "@/img/peguin-topbar.png";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { storeHomeChatPrompt } from "@/lib/home-chat-entry";
import { cn } from "@/lib/utils";

export function HomeChatInput({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function submit() {
    const text = draft.trim();
    if (!text || text.length > 5000 || submitting) return;
    try {
      storeHomeChatPrompt(text);
      setSubmitting(true);
      if (localStorage.getItem("accessToken")) router.push("/vocabulary");
      else window.location.assign("/?auth=login");
    } catch {
      setError("Allow browser storage to continue to AI chat.");
    }
  }

  return (
    <section aria-label="Start learning with AI" className="mb-12 grid gap-3">
      <div className={cn("flex items-center justify-center gap-3 text-center", inverse ? "text-white" : "text-foreground")}>
        <Icon icon={Sparkle} className={inverse ? "text-secondary" : "text-primary"} weight="fill" />
        <h2 className="text-xl font-bold leading-tight sm:text-2xl">What would you like to learn?</h2>
      </div>
      <div className={compact ? "relative isolate mt-8" : undefined}>
        {compact ? <Image src={penguin} alt="FLEN penguin" className="pointer-events-none absolute -top-14 right-3 z-0 size-16 object-contain sm:right-5 sm:-top-16 sm:size-20" /> : null}
      <form
        className={cn("border border-border bg-card text-foreground shadow-sm shadow-foreground/5", compact ? "relative z-10 flex items-center gap-2 rounded-full px-3 py-1.5" : "rounded-3xl p-3 sm:p-4")}
        onSubmit={(event) => { event.preventDefault(); submit(); }}
      >
        {compact ? (
          <>
            <Icon icon={MagnifyingGlass} className="shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              aria-label="Ask the AI assistant"
              placeholder="Ask AI about a word or topic…"
              className="h-10 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              maxLength={5000}
              value={draft}
              disabled={submitting}
              onChange={(event) => { setDraft(event.target.value); setError(""); }}
            />
            <Button type="submit" size="icon" aria-label="Start AI chat" disabled={!draft.trim() || submitting}>
              <Icon icon={ArrowUpRight} />
            </Button>
          </>
        ) : (
          <>
        <Textarea
          autoFocus
          aria-label="Ask the AI assistant"
          placeholder="Ask about a word, practice a conversation, or explore a topic…"
          className="min-h-28 resize-none rounded-2xl border-0 p-2 text-base shadow-none focus-visible:ring-2 sm:min-h-32 md:text-base"
          maxLength={5000}
          value={draft}
          disabled={submitting}
          onChange={(event) => { setDraft(event.target.value); setError(""); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Learn it. Chat about it. Save it.</p>
          <Button type="submit" aria-label="Start AI chat" disabled={!draft.trim() || submitting} className="shrink-0 gap-2 px-4">
            {submitting ? "Opening…" : "Ask AI"}
            <Icon icon={ArrowUpRight} />
          </Button>
        </div>
          </>
        )}
      </form>
      </div>
      {error ? <p role="alert" className={inverse ? "text-white" : "text-destructive"}>{error}</p> : null}
    </section>
  );
}
