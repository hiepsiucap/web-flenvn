"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Flashcard } from "@/lib/dashboard-data";

export function PracticeWordPicker({ cards, selectedIds, onChange, disabled = false }: {
  cards: Flashcard[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const visibleCards = cards.filter((card) =>
    !search || [card.word, card.translation].some((value) => value?.toLocaleLowerCase().includes(search)),
  );
  const selected = new Set(selectedIds);

  return (
    <section aria-label="Choose practice words" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Choose your words</h2>
        <p role="status" className="text-sm tabular-nums text-muted-foreground">{selectedIds.length} selected</p>
      </div>
      <Input type="search" aria-label="Search practice words" placeholder="Search words or Vietnamese translations…" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 bg-card" />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled || !visibleCards.length} onClick={() => onChange([...new Set([...selectedIds, ...visibleCards.map((card) => card.id)])])}>
          {search ? "Select search results" : "Select all"}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={disabled || !selectedIds.length} onClick={() => onChange([])}>Clear selection</Button>
        <span className="ml-auto text-xs text-muted-foreground">{visibleCards.length} of {cards.length} words</span>
      </div>
      {visibleCards.length ? (
        <div className="grid max-h-80 gap-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-2 sm:grid-cols-2">
          {visibleCards.map((card) => (
            <label key={card.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/30">
              <Checkbox className="mt-0.5" checked={selected.has(card.id)} disabled={disabled} onCheckedChange={(checked) => onChange(checked ? [...selectedIds, card.id] : selectedIds.filter((id) => id !== card.id))} />
              <span className="min-w-0">
                <span className="block break-words text-sm font-medium">{card.word}</span>
                {card.translation ? <span className="mt-0.5 block break-words text-xs text-muted-foreground">{card.translation}</span> : null}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">{cards.length ? "No matching words. Try another search." : "No words in this book yet. Choose another book or add flashcards first."}</p>
      )}
      <p className="text-xs text-muted-foreground">Includes this book and its sub-books. You can select words even when they aren’t due.</p>
    </section>
  );
}
