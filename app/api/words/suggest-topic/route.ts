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
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const body = await request.json();
  const backendResponse = await fetch(
    new URL(
      "/api/v1/words/suggest-topic",
      process.env.API_BASE_URL ?? "http://localhost:5000"
    ),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const data = await parseBackendResponse(backendResponse);

  return Response.json(data, { status: backendResponse.status });
}
