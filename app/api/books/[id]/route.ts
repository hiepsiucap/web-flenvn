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

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/books/[id]">
) {
  const token = await getAccessToken(request);
  const { id } = await ctx.params;

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const backendResponse = await fetch(
    new URL(
      `/api/v1/books/${encodeURIComponent(id)}`,
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
