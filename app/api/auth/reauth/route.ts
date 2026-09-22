import type { BackendErrorResponse, TokenResponse } from "@/lib/auth-types";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const tokenCookieNames = ["access_token", "refresh_token"];

async function parseBackendResponse(response: Response) {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return { message: await response.text() };
}

function clearSessionCookies(response: NextResponse) {
  tokenCookieNames.forEach((name) => {
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

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  const loginUrl = new URL("/?auth=login", request.url);

  if (!refreshToken) {
    const response = NextResponse.redirect(loginUrl);
    clearSessionCookies(response);
    return response;
  }

  let backendResponse: Response;

  try {
    backendResponse = await fetchWithTimeout(
      new URL(
        "/api/v1/auth/refresh",
        process.env.API_BASE_URL ?? "http://localhost:5000"
      ),
      {
        method: "POST",
        headers: { "x-refresh-token": refreshToken },
        cache: "no-store",
      }
    );
  } catch {
    return NextResponse.json(
      { message: "Authentication service is temporarily unavailable" },
      { status: 503 }
    );
  }

  const data = (await parseBackendResponse(backendResponse)) as
    | TokenResponse
    | BackendErrorResponse;

  if (!backendResponse.ok) {
    if (
      backendResponse.status === 400 ||
      backendResponse.status === 401 ||
      backendResponse.status === 403
    ) {
      const response = NextResponse.redirect(loginUrl);
      clearSessionCookies(response);
      return response;
    }

    return NextResponse.json(data, { status: backendResponse.status });
  }

  const tokenResponse = data as TokenResponse;

  if (!tokenResponse.data?.accessToken || !tokenResponse.data.refreshToken) {
    return NextResponse.json(
      { message: "Authentication service returned an invalid token response" },
      { status: 502 }
    );
  }

  const response = NextResponse.redirect(new URL("/", request.url));
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
