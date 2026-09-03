import { proxyAuthenticatedRequest } from "@/lib/server-api-proxy";

export async function PATCH(request: Request) {
  return proxyAuthenticatedRequest(request, "/api/v1/streak/settings", {
    method: "PATCH",
    body: await request.text(),
  });
}
