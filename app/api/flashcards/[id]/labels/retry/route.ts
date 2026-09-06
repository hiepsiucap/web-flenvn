import { proxyAuthenticatedRequest } from "@/lib/server-api-proxy";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/flashcards/[id]/labels/retry">
) {
  const { id } = await ctx.params;
  return proxyAuthenticatedRequest(
    request,
    `/api/v1/flashcards/${encodeURIComponent(id)}/labels/retry`,
    { method: "POST" }
  );
}
