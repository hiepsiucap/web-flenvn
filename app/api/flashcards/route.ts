import type { ApiEnvelope } from "@/lib/auth-types";
import type { Flashcard } from "@/lib/dashboard-data";

type CreateFlashcardRequest = {
  word?: string;
  partOfSpeech?: string;
  pronunciation?: string;
  definition?: string;
  translation?: string;
  audioUrl?: string;
  imageUrl?: string;
  example?: string;
  exampleAudioUrl?: string;
  exampleTranslation?: string;
  bookId?: string;
};

async function getAccessToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("access_token="))
    ?.replace("access_token=", "");
}

async function parseBackendResponse(response: Response) {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return { message: await response.text() };
}

export async function POST(request: Request) {
  const token = await getAccessToken(request);

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const body = (await request.json()) as CreateFlashcardRequest;

  if (!body.word?.trim()) {
    return Response.json(
      { message: "Word is required", errors: { word: "Word is required" } },
      { status: 422 }
    );
  }

  const backendResponse = await fetch(
    new URL(
      "/api/v1/flashcards",
      process.env.API_BASE_URL ?? "http://localhost:5000"
    ),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        word: body.word.trim(),
      }),
    }
  );

  const data = (await parseBackendResponse(backendResponse)) as
    | ApiEnvelope<Flashcard>
    | { message?: string; details?: unknown };

  return Response.json(data, { status: backendResponse.status });
}
