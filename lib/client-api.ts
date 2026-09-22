"use client";

import type { ApiEnvelope } from "@/lib/auth-types";
import type {
  Book,
  Flashcard,
  FlashcardFilters,
  FlashcardStats,
  LabelCatalogItem,
  ReviewDueBooksResponse,
  StudyStats,
  UserProfile,
} from "@/lib/dashboard-data";
import { http } from "@/lib/http";
import type { StreakStatus } from "@/lib/streak-types";

type AuthProfileData = { user?: UserProfile | null };

let booksCache: Book[] | null = null;
let booksPromise: Promise<Book[]> | null = null;
let dashboardShellCache: ClientDashboardShellData | null = null;
let dashboardShellPromise: Promise<ClientDashboardShellData> | null = null;

export const CLIENT_DATA_CHANGED_EVENT = "flen:client-data-changed";

export function notifyClientDataChanged() {
  booksCache = null;
  booksPromise = null;
  dashboardShellCache = null;
  dashboardShellPromise = null;
  window.dispatchEvent(new Event(CLIENT_DATA_CHANGED_EVENT));
}

function unwrap<TData>(response: ApiEnvelope<TData> | TData) {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    "success" in response
  ) {
    return (response as ApiEnvelope<TData>).data;
  }

  return response as TData;
}

async function get<TData>(path: string, query?: Record<string, string | boolean>) {
  const response = await http.get<ApiEnvelope<TData> | TData>(path, {
    cache: "no-store",
    query,
  });
  return unwrap(response);
}

export function getBooksClient() {
  if (booksCache) return Promise.resolve(booksCache);
  if (booksPromise) return booksPromise;

  booksPromise = get<Book[]>("/api/books")
    .then((books) => {
      booksCache = books;
      return books;
    })
    .finally(() => {
      booksPromise = null;
    });

  return booksPromise;
}

export function getCachedBooksClient() {
  return booksCache;
}

export function getBookClient(bookId: string) {
  return get<Book>(`/api/books/${encodeURIComponent(bookId)}`);
}

export function getReviewDueBooksClient() {
  return get<ReviewDueBooksResponse>("/api/books/review/due");
}

export async function getFlashcardsByBookClient(
  bookId: string,
  filters: FlashcardFilters = {}
) {
  const statuses = ["new", "learning", "reviewing", "mastered"] as const;
  const groups = await Promise.all(
    statuses.map((status) =>
      get<Flashcard[]>("/api/flashcards", {
        bookId,
        status,
        ...(filters.labelIds?.length
          ? {
              labelIds: filters.labelIds.join(","),
              labelMode: filters.labelMode ?? "any",
            }
          : {}),
      })
    )
  );

  return Array.from(
    new Map(groups.flat().map((card) => [card.id, card])).values()
  );
}

export function getLabelsClient(includeCounts = false) {
  return get<LabelCatalogItem[]>("/api/labels", { includeCounts });
}

function getInitials(value: string) {
  return value
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export async function getDashboardShellDataClient() {
  if (dashboardShellCache) return dashboardShellCache;
  if (dashboardShellPromise) return dashboardShellPromise;

  dashboardShellPromise = loadDashboardShellDataClient()
    .then((data) => {
      if (!data.error) dashboardShellCache = data;
      return data;
    })
    .finally(() => {
      dashboardShellPromise = null;
    });

  return dashboardShellPromise;
}

export function getCachedDashboardShellDataClient() {
  return dashboardShellCache;
}

async function loadDashboardShellDataClient() {
  const [userProfile, authProfile, flashcards, streak] = await Promise.all([
    get<UserProfile>("/api/users/profile").catch(() => null),
    get<AuthProfileData>("/api/auth/profile").catch(() => null),
    get<FlashcardStats>("/api/flashcards/stats").catch(() => null),
    get<StreakStatus>("/api/streak").catch(() => null),
  ]);
  const profile = userProfile ?? authProfile?.user ?? null;
  const displayName = profile?.username || profile?.email || "FLEN learner";
  const totalCards = flashcards?.total ?? 0;
  const masteryProgress = totalCards
    ? Math.round(((flashcards?.mastered ?? 0) / totalCards) * 100)
    : 0;

  return {
    name: displayName,
    email: profile?.email ?? "",
    avatar: profile?.avatar ?? null,
    initials: getInitials(displayName),
    progress: Math.max(
      0,
      Math.min(100, profile?.rank?.progressPercent ?? masteryProgress)
    ),
    exp: profile?.exp ?? 0,
    level: profile?.level ?? 1,
    rank: profile?.rank ?? null,
    streak: streak?.currentStreak ?? profile?.streak ?? 0,
    streakStatus: streak,
    error: profile ? null : "Unable to load your profile.",
  };
}

export async function getDashboardPageDataClient() {
  const [flashcards, books, study] = await Promise.all([
    get<FlashcardStats>("/api/flashcards/stats"),
    get<Book[]>("/api/books"),
    get<StudyStats>("/api/sessions/stats", { days: "7" }),
  ]);
  const nextDeck = books.slice().sort((a, b) => b.totalCards - a.totalCards)[0] ?? null;
  const totalCards = flashcards.total ?? 0;
  const masteredCards = flashcards.mastered ?? 0;

  return {
    activeDecks: books.length,
    cardsDue: flashcards.dueForReview ?? 0,
    accuracy: study.accuracy ?? 0,
    nextDeck,
    totalCards,
    masteredCards,
    masteredPercent: totalCards
      ? Math.round((masteredCards / totalCards) * 100)
      : 0,
    error: null as string | null,
  };
}

export type ClientDashboardPageData = Awaited<
  ReturnType<typeof getDashboardPageDataClient>
>;
export type ClientDashboardShellData = Awaited<
  ReturnType<typeof loadDashboardShellDataClient>
>;
