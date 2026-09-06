import { proxyAuthenticatedRequest } from "@/lib/server-api-proxy";

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/flashcards/[id]/labels">
) {
  const { id } = await ctx.params;
  return proxyAuthenticatedRequest(
    request,
    `/api/v1/flashcards/${encodeURIComponent(id)}/labels`,
    { method: "PUT", body: JSON.stringify(await request.json()) }
  );
}
