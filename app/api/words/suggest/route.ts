import type { ApiEnvelope } from "@/lib/auth-types";

type WordSuggestion = {
  word?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  definitions?: { text?: string; partOfSpeech?: string }[];
  translation?: string;
  examples?: { text?: string; translation?: string }[];
  audio?: { url?: string };
  images?: { url?: string }[];
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

export async function GET(request: Request) {
  const token = await getAccessToken(request);

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const word = requestUrl.searchParams.get("word")?.trim();

  if (!word) {
    return Response.json(
      { message: "Enter a word before using suggest" },
      { status: 422 }
    );
  }

  const backendUrl = new URL(
    "/api/v1/words/suggest",
    process.env.API_BASE_URL ?? "http://localhost:5000"
  );
  backendUrl.searchParams.set("word", word);
  backendUrl.searchParams.set(
    "targetLanguage",
    requestUrl.searchParams.get("targetLanguage") ?? "vi"
  );
  backendUrl.searchParams.set(
    "imageLimit",
    requestUrl.searchParams.get("imageLimit") ?? "3"
  );

  const backendResponse = await fetch(backendUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await parseBackendResponse(backendResponse)) as
    | ApiEnvelope<WordSuggestion>
    | { message?: string; details?: unknown };

  return Response.json(data, { status: backendResponse.status });
}
