import type {
  ApiErrorResponse,
  BackendErrorResponse,
  RegisterRequest,
  RegisterResponse,
} from "@/lib/auth-types";
import { NextResponse } from "next/server";

function json<TData>(data: TData, init?: ResponseInit) {
  return Response.json(data, init);
}

function validateRegister(input: Partial<RegisterRequest>) {
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
  let body: Partial<RegisterRequest>;

  try {
    body = (await request.json()) as Partial<RegisterRequest>;
  } catch {
    return json<ApiErrorResponse>(
      { message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const errors = validateRegister(body);

  if (Object.keys(errors).length > 0) {
    return json<ApiErrorResponse>(
      { message: "Please check your registration details", errors },
      { status: 422 }
    );
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:5000";
  const payload: RegisterRequest = {
    email: body.email!,
    password: body.password!,
    username: body.username?.trim() || undefined,
  };

  try {
    const backendResponse = await fetch(
      new URL("/api/v1/auth/register", apiBaseUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = (await parseBackendResponse(backendResponse)) as
      | RegisterResponse
      | BackendErrorResponse;

    if (!backendResponse.ok) {
      return json<ApiErrorResponse>(
        {
          message: normalizeMessage(
            "message" in data ? data.message : undefined,
            "Unable to create account"
          ),
          details: "details" in data ? data.details : undefined,
        },
        { status: backendResponse.status }
      );
    }

    const registerResponse = data as RegisterResponse;
    const response = NextResponse.json<RegisterResponse>(registerResponse);
    const cookieOptions = {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };

    response.cookies.set("access_token", registerResponse.data.accessToken, {
      ...cookieOptions,
      maxAge: 28800,
    });
    response.cookies.set("refresh_token", registerResponse.data.refreshToken, {
      ...cookieOptions,
      maxAge: 2592000,
    });

    return response;
  } catch {
    return json<ApiErrorResponse>(
      { message: "Cannot reach the authentication service" },
      { status: 503 }
    );
  }
}
