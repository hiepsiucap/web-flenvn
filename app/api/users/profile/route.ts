import type { ApiEnvelope } from "@/lib/auth-types";
import type { UserProfile } from "@/lib/dashboard-data";

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

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const backendResponse = await fetch(
    new URL(
      "/api/v1/users/profile",
      process.env.API_BASE_URL ?? "http://localhost:5000"
    ),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );
  const data = (await parseBackendResponse(backendResponse)) as
    | ApiEnvelope<UserProfile>
    | { message?: string; details?: unknown };

  return Response.json(data, { status: backendResponse.status });
}

export async function PUT(request: Request) {
  const token = await getAccessToken(request);

  if (!token) {
    return Response.json({ message: "Please sign in again" }, { status: 401 });
  }

  const backendResponse = await fetch(
    new URL("/api/v1/users/profile", process.env.API_BASE_URL ?? "http://localhost:5000"),
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: await request.text(),
      cache: "no-store",
    }
  );
  const data = await parseBackendResponse(backendResponse);

  return Response.json(data, { status: backendResponse.status });
}
