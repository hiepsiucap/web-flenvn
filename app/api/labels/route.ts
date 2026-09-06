import { proxyAuthenticatedRequest } from "@/lib/server-api-proxy";

export async function GET(request: Request) {
  const sourceUrl = new URL(request.url);
  const targetUrl = new URL("/api/v1/labels", "http://backend.local");
  const includeCounts = sourceUrl.searchParams.get("includeCounts");

  if (includeCounts) targetUrl.searchParams.set("includeCounts", includeCounts);

  return proxyAuthenticatedRequest(
    request,
    `${targetUrl.pathname}${targetUrl.search}`
  );
}

export async function POST(request: Request) {
  return proxyAuthenticatedRequest(request, "/api/v1/labels", {
    method: "POST",
    body: JSON.stringify(await request.json()),
  });
}
