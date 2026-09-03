import { proxyAuthenticatedRequest } from "@/lib/server-api-proxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ flashcardId: string }> }
) {
  const { flashcardId } = await params;
  return proxyAuthenticatedRequest(
    request,
    `/api/v1/sessions/flashcard/${encodeURIComponent(flashcardId)}`,
    { method: "POST", body: await request.text() }
  );
}
