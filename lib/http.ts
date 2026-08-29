type QueryValue = string | number | boolean | null | undefined;

type RequestOptions<TBody = unknown> = Omit<RequestInit, "body"> & {
  body?: TBody;
  query?: Record<string, QueryValue | QueryValue[]>;
};

export class HttpError<TData = unknown> extends Error {
  status: number;
  statusText: string;
  data: TData | null;

  constructor(response: Response, data: TData | null) {
    super(`Request failed with ${response.status} ${response.statusText}`);
    this.name = "HttpError";
    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
  }
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path, getBaseUrl());

  if (!query) {
    return url.toString();
  }

  Object.entries(query).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];

    values.forEach((item) => {
      if (item !== null && item !== undefined) {
        url.searchParams.append(key, String(item));
      }
    });
  });

  return url.toString();
}

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}

function isJsonBody(body: unknown) {
  return (
    body !== undefined &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof URLSearchParams)
  );
}

async function parseResponse<TData>(response: Response) {
  if (response.status === 204) {
    return null as TData;
  }

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return (await response.json()) as TData;
  }

  return (await response.text()) as TData;
}

export async function request<TData, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {},
  retryOnUnauthorized = true
) {
  const { body, headers, query, ...init } = options;
  const requestHeaders = new Headers(headers);
  const shouldStringify = isJsonBody(body);

  if (shouldStringify && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    body: shouldStringify ? JSON.stringify(body) : (body as BodyInit),
    headers: requestHeaders,
  });

  const data = await parseResponse<TData>(response);

  if (!response.ok) {
    if (
      response.status === 401 &&
      retryOnUnauthorized &&
      path !== "/api/auth/refresh" &&
      typeof window !== "undefined"
    ) {
      const refreshed = await refreshSession();

      if (refreshed) {
        return request<TData, TBody>(path, options, false);
      }
    }

    throw new HttpError(response, data);
  }

  return data;
}

async function refreshSession() {
  try {
    const refreshToken = window.localStorage.getItem("refreshToken");
    const response = await request<{
      data: { accessToken: string; refreshToken: string };
    }>(
      "/api/auth/refresh",
      {
        method: "POST",
        headers: refreshToken ? { "x-refresh-token": refreshToken } : undefined,
      },
      false
    );

    window.localStorage.setItem("accessToken", response.data.accessToken);
    window.localStorage.setItem("refreshToken", response.data.refreshToken);

    return true;
  } catch {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("refreshToken");
    return false;
  }
}

export const http = {
  delete: <TData>(path: string, options?: RequestOptions) =>
    request<TData>(path, { ...options, method: "DELETE" }),
  get: <TData>(path: string, options?: RequestOptions) =>
    request<TData>(path, { ...options, method: "GET" }),
  patch: <TData, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: RequestOptions<TBody>
  ) => request<TData, TBody>(path, { ...options, body, method: "PATCH" }),
  post: <TData, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: RequestOptions<TBody>
  ) => request<TData, TBody>(path, { ...options, body, method: "POST" }),
  put: <TData, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: RequestOptions<TBody>
  ) => request<TData, TBody>(path, { ...options, body, method: "PUT" }),
};
