import { proxyAuthenticatedRequest } from "@/lib/server-api-proxy";

export async function GET(request: Request) {
  return proxyAuthenticatedRequest(request, "/api/v1/streak");
}
