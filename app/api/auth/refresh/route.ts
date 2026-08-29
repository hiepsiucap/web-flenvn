import type {
  ApiErrorResponse,
  BackendErrorResponse,
  TokenResponse,
} from "@/lib/auth-types";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function parseBackendResponse(response: Response) {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return { message: await response.text() };
}

function normalizeMessage(message: unknown, fallback: string) {
  if (Array.isArray(message)) {
    return message.filter(Boolean).join(", ") || fallback;
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return fallback;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken =
    cookieStore.get("refresh_token")?.value ??
    request.headers.get("x-refresh-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!refreshToken) {
    return NextResponse.json<ApiErrorResponse>(
      { message: "Refresh token is missing" },
      { status: 401 }
    );
  }

  const backendResponse = await fetch(
    new URL(
      "/api/v1/auth/refresh",
      process.env.API_BASE_URL ?? "http://localhost:5000"
    ),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    }
  );
  const data = (await parseBackendResponse(backendResponse)) as
    | TokenResponse
    | BackendErrorResponse;

  if (!backendResponse.ok) {
    return NextResponse.json<ApiErrorResponse>(
      {
        message: normalizeMessage(
          "message" in data ? data.message : undefined,
          "Unable to refresh session"
        ),
        details: "details" in data ? data.details : undefined,
      },
      { status: backendResponse.status }
    );
  }

  const tokenResponse = data as TokenResponse;
  const response = NextResponse.json<TokenResponse>(tokenResponse);
  const cookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  response.cookies.set("access_token", tokenResponse.data.accessToken, {
    ...cookieOptions,
    maxAge: 28800,
  });
  response.cookies.set("refresh_token", tokenResponse.data.refreshToken, {
    ...cookieOptions,
    maxAge: 2592000,
  });

  return response;
}
