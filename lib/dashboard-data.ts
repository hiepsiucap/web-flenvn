import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { ApiEnvelope } from "@/lib/auth-types";
import type { StreakStatus } from "@/lib/streak-types";

export type UserRank = {
  slug: string;
  name: string;
  division: "III" | "II" | "I" | null;
  displayName: string;
  imageUrl: string;
  nextRank: string | null;
  progressPercent: number;
};

export type UserProfile = {
  id: string;
  email: string;
  username?: string | null;
  avatar?: string | null;
  streak?: number;
  level: number;
  exp: number;
  rank: UserRank;
};

type AuthProfileData = {
  user?: UserProfile | null;
};

export type FlashcardStats = {
  total: number;
  new: number;
  learning: number;
  reviewing: number;
  mastered: number;
  dueForReview: number;
};

export type StudyStats = {
  totalSessions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skipped: number;
  accuracy: number;
  averageResponseTime: number;
};

export type Book = {
  id: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  wordCount?: number;
  totalCards: number;
  isPublic?: boolean;
};

export type ReviewDueBook = {
  bookId: string;
  id?: string;
  title: string;
  coverImage?: string | null;
  totalCards: number;
  dueForReview: number;
};

export type ReviewDueBooksResponse = {
  books: ReviewDueBook[];
  totalDueForReview: number;
};

export type FlashcardStatus = "new" | "learning" | "reviewing" | "mastered";

export type Flashcard = {
  id: string;
  word: string;
  partOfSpeech?: string | null;
  pronunciation?: string | null;
  definition?: string | null;
  translation?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  example?: string | null;
  exampleAudioUrl?: string | null;
  exampleTranslation?: string | null;
  status: FlashcardStatus;
  bookId?: string | null;
};

type BackendResult<TData> = {
  data: TData | null;
  error: string | null;
  authenticationRequired: boolean;
};

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:5000";
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value;
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = Buffer.from(normalizedPayload, "base64").toString(
      "utf8"
    );

    return JSON.parse(decodedPayload) as Partial<UserProfile> & {
      sub?: string;
    };
  } catch {
    return null;
  }
}

async function backendGet<TData>(path: string) {
  const result = await backendGetResult<TData>(path);

  if (result.authenticationRequired) {
    redirect("/api/auth/reauth");
  }

  return result.data;
}

async function backendGetResult<TData>(path: string): Promise<BackendResult<TData>> {
  const token = await getAccessToken();

  if (!token) {
    return {
      data: null,
      error: "Please sign in to load dashboard data.",
      authenticationRequired: true,
    };
  }

  try {
    const response = await fetch(new URL(path, getApiBaseUrl()), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      return {
        data: null,
        error: "Your session has expired.",
        authenticationRequired: true,
      };
    }

    if (!response.ok) {
      return {
        data: null,
        error: `Backend request failed with ${response.status}.`,
        authenticationRequired: false,
      };
    }

    const envelope = (await response.json()) as ApiEnvelope<TData>;
    return { data: envelope.data, error: null, authenticationRequired: false };
  } catch {
    return {
      data: null,
      error: "Cannot reach the dashboard service.",
      authenticationRequired: false,
    };
  }
}

export async function getBooks() {
  return (await backendGet<Book[]>("/api/v1/books")) ?? [];
}

export async function getBook(bookId: string) {
  return await backendGet<Book>(`/api/v1/books/${bookId}`);
}

export async function getReviewDueBooks() {
  return (
    (await backendGet<ReviewDueBooksResponse>("/api/v1/books/review/due")) ?? {
      books: [],
      totalDueForReview: 0,
    }
  );
}

export async function getFlashcardsByBook(bookId: string) {
  const statuses: FlashcardStatus[] = [
    "new",
    "learning",
    "reviewing",
    "mastered",
  ];

  const groups = await Promise.all(
    statuses.map((status) =>
      backendGet<Flashcard[]>(
        `/api/v1/flashcards?bookId=${encodeURIComponent(
          bookId
        )}&status=${status}`
      )
    )
  );

  const flashcards = groups.flatMap((group) => group ?? []);
  return Array.from(new Map(flashcards.map((card) => [card.id, card])).values());
}

export async function getDashboardShellData() {
  const token = await getAccessToken();
  const tokenProfile = token ? decodeJwtPayload(token) : null;
  const [userProfileResult, authProfileResult, flashcardsResult, streakResult] =
    await Promise.all([
      backendGetResult<UserProfile>("/api/v1/users/profile"),
      backendGetResult<AuthProfileData>("/api/v1/auth/profile"),
      backendGetResult<FlashcardStats>("/api/v1/flashcards/stats"),
      backendGetResult<StreakStatus>("/api/v1/streak"),
  ]);
  const userProfile = userProfileResult.data;
  const authProfile = authProfileResult.data;
  const flashcards = flashcardsResult.data;
  const streak = streakResult.data;

  if (
    [userProfileResult, authProfileResult, flashcardsResult, streakResult].some(
      (result) => result.authenticationRequired
    )
  ) {
    redirect("/api/auth/reauth");
  }
  const profile = userProfile ?? authProfile?.user ?? tokenProfile;
  const displayName =
    profile?.username || profile?.email || tokenProfile?.email || "FLEN learner";
  const displayEmail = profile?.email ?? tokenProfile?.email ?? "";

  const totalCards = flashcards?.total ?? 0;
  const masteryProgress =
    totalCards > 0 ? Math.round(((flashcards?.mastered ?? 0) / totalCards) * 100) : 0;
  const progress = Math.max(
    0,
    Math.min(100, profile?.rank?.progressPercent ?? masteryProgress)
  );

  return {
    name: displayName,
    email: displayEmail,
    avatar: profile?.avatar ?? null,
    initials: getInitials(displayName),
    progress,
    exp: profile?.exp ?? 0,
    level: profile?.level ?? 1,
    rank: profile?.rank ?? null,
    streak: streak?.currentStreak ?? profile?.streak ?? 0,
    streakStatus: streak,
    error:
      userProfileResult.error ??
      authProfileResult.error ??
      flashcardsResult.error ??
      streakResult.error ??
      null,
  };
}

export async function getDashboardPageData() {
  const [flashcardsResult, booksResult, studyResult] = await Promise.all([
    backendGetResult<FlashcardStats>("/api/v1/flashcards/stats"),
    backendGetResult<Book[]>("/api/v1/books"),
    backendGetResult<StudyStats>("/api/v1/sessions/stats?days=7"),
  ]);
  const flashcards = flashcardsResult.data;
  const books = booksResult.data ?? [];
  const study = studyResult.data;

  const activeDecks = books?.length ?? 0;
  const nextDeck =
    books?.slice().sort((a, b) => b.totalCards - a.totalCards)[0] ?? null;
  const totalCards = flashcards?.total ?? 0;
  const masteredCards = flashcards?.mastered ?? 0;
  const masteredPercent =
    totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  return {
    activeDecks,
    cardsDue: flashcards?.dueForReview ?? 0,
    accuracy: study?.accuracy ?? 0,
    nextDeck,
    totalCards,
    masteredCards,
    masteredPercent,
    error: flashcardsResult.error ?? booksResult.error ?? studyResult.error,
  };
}

function getInitials(value: string) {
  const parts = value
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
