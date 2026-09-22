import type { ApiEnvelope } from "@/lib/auth-types";
import type { RankCatalogResponse } from "@/lib/rank-types";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

function getAccessToken(request: Request) {
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
  return contentType?.includes("application/json")
    ? response.json()
    : { message: await response.text() };
}

export async function GET(request: Request) {
  const token = getAccessToken(request);

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const backendResponse = await fetchWithTimeout(
    new URL("/api/v1/ranks", process.env.API_BASE_URL ?? "http://localhost:5000"),
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  const data = (await parseBackendResponse(backendResponse)) as
    | ApiEnvelope<RankCatalogResponse>
    | RankCatalogResponse
    | { message?: string; details?: unknown };

  return Response.json(data, { status: backendResponse.status });
}
