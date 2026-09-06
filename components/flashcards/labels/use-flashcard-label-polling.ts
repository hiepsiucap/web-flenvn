"use client";

import { useEffect, useRef, useState } from "react";

import type { ApiEnvelope } from "@/lib/auth-types";
import type { Flashcard } from "@/lib/dashboard-data";
import { http } from "@/lib/http";

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 30_000;

function unwrapFlashcard(response: ApiEnvelope<Flashcard> | Flashcard) {
  return "data" in response ? response.data : response;
}

export function useFlashcardLabelPolling(
  cards: Flashcard[],
  onCardChange: (card: Flashcard) => void
) {
  const callbackRef = useRef(onCardChange);
  const [timedOutIds, setTimedOutIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    callbackRef.current = onCardChange;
  }, [onCardChange]);

  const activeIds = cards
    .filter((card) => card.labelingStatus === "pending" || card.labelingStatus === "processing")
    .map((card) => card.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!activeIds) return;

    const controller = new AbortController();
    const startedAt = Date.now();
    const ids = activeIds.split(",");
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setTimedOutIds((current) => new Set([...current, ...ids]));
        return;
      }

      try {
        const results = await Promise.all(
          ids.map((id) =>
            http.get<ApiEnvelope<Flashcard> | Flashcard>(`/api/flashcards/${id}`, {
              signal: controller.signal,
            })
          )
        );

        results.map(unwrapFlashcard).forEach(callbackRef.current);
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        // Stop aggressive polling after a network error. Visibility recovery below
        // gives the user a quiet retry path without producing repeated requests.
      }
    }

    void poll();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [activeIds]);

  useEffect(() => {
    async function refreshOnFocus() {
      if (document.visibilityState !== "visible") return;
      const ids = new Set([...activeIds.split(",").filter(Boolean), ...timedOutIds]);

      await Promise.allSettled(
        [...ids].map(async (id) => {
          const response = await http.get<ApiEnvelope<Flashcard> | Flashcard>(`/api/flashcards/${id}`);
          const card = unwrapFlashcard(response);
          callbackRef.current(card);
          if (card.labelingStatus === "completed" || card.labelingStatus === "failed") {
            setTimedOutIds((current) => {
              const next = new Set(current);
              next.delete(id);
              return next;
            });
          }
        })
      );
    }

    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => document.removeEventListener("visibilitychange", refreshOnFocus);
  }, [activeIds, timedOutIds]);

  return timedOutIds;
}
