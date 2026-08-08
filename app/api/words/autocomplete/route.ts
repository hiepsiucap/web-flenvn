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
  const query = requestUrl.searchParams.get("q")?.trim();

  if (!query) {
    return Response.json([]);
  }

  const backendUrl = new URL(
    "/api/v1/words/autocomplete",
    process.env.API_BASE_URL ?? "http://localhost:5000"
  );
  backendUrl.searchParams.set("q", query);
  backendUrl.searchParams.set("limit", requestUrl.searchParams.get("limit") ?? "5");

  const backendResponse = await fetch(backendUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseBackendResponse(backendResponse);

  return Response.json(data, { status: backendResponse.status });
}
