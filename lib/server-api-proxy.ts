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

export async function proxyAuthenticatedRequest(
  request: Request,
  path: string,
  init: RequestInit = {}
) {
  const token = getAccessToken(request);

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const backendResponse = await fetchWithTimeout(
    new URL(path, process.env.API_BASE_URL ?? "http://localhost:5000"),
    { ...init, headers, cache: "no-store" }
  );
  const data = await parseBackendResponse(backendResponse);
  return Response.json(data, { status: backendResponse.status });
}
