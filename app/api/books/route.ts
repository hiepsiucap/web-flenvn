import type { ApiEnvelope } from "@/lib/auth-types";
import type { Book } from "@/lib/dashboard-data";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

type CreateBookRequest = {
  title?: string;
  description?: string;
  author?: string;
  content?: string;
  coverImage?: string;
  isPublic?: boolean;
};

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

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  let requestBody: BodyInit;
  let title = "";
  let headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };

  if (isMultipart) {
    const formData = await request.formData();
    title = String(formData.get("title") ?? "");
    requestBody = normalizeBookFormData(formData);
  } else {
    const body = (await request.json()) as CreateBookRequest;
    title = body.title ?? "";
    headers = {
      ...headers,
      "Content-Type": "application/json",
    };
    requestBody = JSON.stringify({
      ...body,
      title: title.trim(),
    });
  }

  if (!title.trim()) {
    return Response.json(
      { message: "Book title is required", errors: { title: "Book title is required" } },
      { status: 422 }
    );
  }

  const backendResponse = await fetchWithTimeout(
    new URL("/api/v1/books", process.env.API_BASE_URL ?? "http://localhost:5000"),
    {
      method: "POST",
      headers,
      body: requestBody,
    }
  );

  const data = (await parseBackendResponse(backendResponse)) as
    | ApiEnvelope<Book>
    | { message?: string; details?: unknown };

  return Response.json(data, { status: backendResponse.status });
}

function normalizeBookFormData(formData: FormData) {
  const nextFormData = new FormData();

  formData.forEach((value, key) => {
    if (value instanceof File && value.size === 0) {
      return;
    }

    if (typeof value === "string" && key !== "isPublic" && !value.trim()) {
      return;
    }

    nextFormData.append(key, key === "title" && typeof value === "string" ? value.trim() : value);
  });

  if (!nextFormData.has("isPublic")) {
    nextFormData.append("isPublic", "false");
  }

  return nextFormData;
}
