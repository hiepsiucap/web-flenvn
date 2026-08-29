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

function clearSessionCookies(response: NextResponse) {
  ["access_token", "refresh_token"].forEach((name) => {
    response.cookies.set(name, "", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      expires: new Date(0),
    });
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken =
    cookieStore.get("refresh_token")?.value ??
    request.headers.get("x-refresh-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!refreshToken) {
    const response = NextResponse.json<ApiErrorResponse>(
      { message: "Refresh token is missing" },
      { status: 401 }
    );
    clearSessionCookies(response);
    return response;
  }

  const backendResponse = await fetch(
    new URL(
      "/api/v1/auth/refresh",
      process.env.API_BASE_URL ?? "http://localhost:5000"
    ),
    {
      method: "POST",
      headers: {
        "x-refresh-token": refreshToken,
      },
    }
  );
  const data = (await parseBackendResponse(backendResponse)) as
    | TokenResponse
    | BackendErrorResponse;

  if (!backendResponse.ok) {
    const response = NextResponse.json<ApiErrorResponse>(
      {
        message: normalizeMessage(
          "message" in data ? data.message : undefined,
          "Unable to refresh session"
        ),
        details: "details" in data ? data.details : undefined,
      },
      { status: backendResponse.status }
    );

    if ([400, 401, 403].includes(backendResponse.status)) {
      clearSessionCookies(response);
    }

    return response;
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
    maxAge: 604800,
  });

  return response;
}
