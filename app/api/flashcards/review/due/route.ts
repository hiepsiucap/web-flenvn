import type { ApiEnvelope } from "@/lib/auth-types";
import type { Flashcard } from "@/lib/dashboard-data";

async function getAccessToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const cookieToken = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("access_token="))
    ?.replace("access_token=", "");

  return cookieToken ?? request.headers.get("authorization")?.replace("Bearer ", "");
}

async function parseBackendResponse(response: Response) {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return { message: await response.text() };
}

export async function GET(request: Request) {
  const token = await getAccessToken(request);
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId");
  const limit = url.searchParams.get("limit");

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  if (!bookId || !limit) {
    return Response.json(
      { message: "bookId and limit are required" },
      { status: 422 }
    );
  }

  const backendUrl = new URL(
    "/api/v1/flashcards/review/due",
    process.env.API_BASE_URL ?? "http://localhost:5000"
  );
  backendUrl.searchParams.set("bookId", bookId);
  backendUrl.searchParams.set("limit", limit);

  const backendResponse = await fetch(backendUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const data = (await parseBackendResponse(backendResponse)) as
    | ApiEnvelope<Flashcard[]>
    | Flashcard[]
    | { message?: string; details?: unknown };

  return Response.json(data, { status: backendResponse.status });
}
