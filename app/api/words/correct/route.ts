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

  const body = (await request.json()) as {
    text?: string;
    language?: string;
  };

  if (!body.text?.trim()) {
    return Response.json(
      { message: "Enter text before correcting" },
      { status: 422 }
    );
  }

  const backendResponse = await fetch(
    new URL(
      "/api/v1/words/correct",
      process.env.API_BASE_URL ?? "http://localhost:5000"
    ),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: body.text,
        language: body.language ?? "en-US",
      }),
    }
  );
  const data = await parseBackendResponse(backendResponse);

  return Response.json(data, { status: backendResponse.status });
}
