import type {
  ApiErrorResponse,
  BackendErrorResponse,
  LoginRequest,
  LoginResponse,
} from "@/lib/auth-types";
import { NextResponse } from "next/server";

function json<TData>(data: TData, init?: ResponseInit) {
  return Response.json(data, init);
}

function validateLogin(input: Partial<LoginRequest>) {
  const errors: Record<string, string> = {};

  if (!input.email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!input.password) {
    errors.password = "Password is required";
  } else if (input.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  return errors;
}

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
  let body: Partial<LoginRequest>;

  try {
    body = (await request.json()) as Partial<LoginRequest>;
  } catch {
    return json<ApiErrorResponse>(
      { message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const errors = validateLogin(body);

  if (Object.keys(errors).length > 0) {
    return json<ApiErrorResponse>(
      { message: "Please check your login details", errors },
      { status: 422 }
    );
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:5000";
  const credentials: LoginRequest = {
    email: body.email!,
    password: body.password!,
  };

  try {
    const backendResponse = await fetch(
      new URL("/api/v1/auth/login", apiBaseUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      }
    );

    const data = (await parseBackendResponse(backendResponse)) as
      | LoginResponse
      | BackendErrorResponse;

    if (!backendResponse.ok) {
      return json<ApiErrorResponse>(
        {
          message: normalizeMessage(
            "message" in data ? data.message : undefined,
            "Unable to sign in"
          ),
          details: "details" in data ? data.details : undefined,
        },
        { status: backendResponse.status }
      );
    }

    const loginResponse = data as LoginResponse;
    const response = NextResponse.json<LoginResponse>(loginResponse);
    const cookieOptions = {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };

    response.cookies.set("access_token", loginResponse.data.accessToken, {
      ...cookieOptions,
      maxAge: 28800,
    });
    response.cookies.set("refresh_token", loginResponse.data.refreshToken, {
      ...cookieOptions,
      maxAge: 604800,
    });

    return response;
  } catch {
    return json<ApiErrorResponse>(
      { message: "Cannot reach the authentication service" },
      { status: 503 }
    );
  }
}
