import { proxyAuthenticatedRequest } from "@/lib/server-api-proxy";

export async function POST(request: Request) {
  return proxyAuthenticatedRequest(request, "/api/v1/shadowing/prepare", {
    method: "POST",
    body: await request.text(),
  });
}
