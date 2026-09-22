import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

type GenerateBackgroundsRequest = {
  title?: string;
  description?: string;
  count?: number;
};

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

export async function POST(request: Request) {
  const token = await getAccessToken(request);

  if (!token) {
    return Response.json(
      { message: "Please sign in again" },
      { status: 401 }
    );
  }

  const body = (await request.json()) as GenerateBackgroundsRequest;
  const title = body.title?.trim();

  if (!title) {
    return Response.json(
      {
        message: "Enter a book title before generating covers",
        errors: { title: "Book title is required" },
      },
      { status: 422 }
    );
  }

  const count = Math.min(6, Math.max(1, Math.trunc(body.count ?? 3)));
  const backendResponse = await fetchWithTimeout(
    new URL(
      "/api/v1/books/backgrounds/generate",
      process.env.API_BASE_URL ?? "http://localhost:5000"
    ),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description: body.description?.trim() || undefined,
        count,
      }),
    }
  );
  const data = await parseBackendResponse(backendResponse);

  return Response.json(data, { status: backendResponse.status });
}
