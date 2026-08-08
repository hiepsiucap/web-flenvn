import type { ApiEnvelope } from "@/lib/auth-types";
import { NextResponse } from "next/server";

const tokenCookieNames = [
  "access_token",
  "refresh_token",
  "accessToken",
  "refreshToken",
];

export async function POST() {
  const response = NextResponse.json<ApiEnvelope<null>>(
    {
      success: true,
      data: null,
      message: "Logged out successfully",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );

  tokenCookieNames.forEach((name) => {
    response.cookies.set(name, "", {
      httpOnly: name.includes("_"),
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      expires: new Date(0),
    });
  });

  return response;
}
