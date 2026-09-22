import type { ApiEnvelope } from "@/lib/auth-types";
import type { Flashcard } from "@/lib/dashboard-data";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

type UpdateFlashcardRequest = Partial<{
  word: string;
  partOfSpeech: string;
  pronunciation: string;
  definition: string;
  translation: string;
  audioUrl: string;
  imageUrl: string;
  example: string;
  exampleAudioUrl: string;
  exampleTranslation: string;
  bookId: string;
  labelIds: string[];
  autoLabel: boolean;
}>;

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

export async function GET(request: Request, ctx: RouteContext<"/api/flashcards/[id]">) {
  const token = await getAccessToken(request);
  const { id } = await ctx.params;

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const backendResponse = await fetchWithTimeout(
    new URL(
      `/api/v1/flashcards/${encodeURIComponent(id)}`,
      process.env.API_BASE_URL ?? "http://localhost:5000"
    ),
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  const data = await parseBackendResponse(backendResponse);

  return Response.json(data, { status: backendResponse.status });
}

export async function PUT(request: Request, ctx: RouteContext<"/api/flashcards/[id]">) {
  const token = await getAccessToken(request);
  const { id } = await ctx.params;

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const body = (await request.json()) as UpdateFlashcardRequest;

  if (!body.word?.trim()) {
    return Response.json(
      { message: "Word is required", errors: { word: "Word is required" } },
      { status: 422 }
    );
  }

  const backendResponse = await fetchWithTimeout(
    new URL(
      `/api/v1/flashcards/${encodeURIComponent(id)}`,
      process.env.API_BASE_URL ?? "http://localhost:5000"
    ),
    {
      method: "PUT",
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

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/flashcards/[id]">
) {
  const token = await getAccessToken(request);
  const { id } = await ctx.params;

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const backendResponse = await fetchWithTimeout(
    new URL(
      `/api/v1/flashcards/${encodeURIComponent(id)}`,
      process.env.API_BASE_URL ?? "http://localhost:5000"
    ),
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await parseBackendResponse(backendResponse);

  return Response.json(data, { status: backendResponse.status });
}
