import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/http", () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

import { http } from "@/lib/http";
import { createSubmission, getMySubmissions, SubmissionError } from "./submissions";

const post = vi.mocked(http.post);
const get = vi.mocked(http.get);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("submission API", () => {
  it("loads the signed-in user's submissions from the response envelope", async () => {
    const items = [{ id: "one", type: "feedback" }];
    get.mockResolvedValueOnce({ data: items } as never);
    await expect(getMySubmissions()).resolves.toEqual(items);
    expect(get).toHaveBeenCalledWith("/api/submissions/mine");
  });

  it("uploads evidence before creating a report and sends the returned file URL", async () => {
    const file = new File(["image"], "bug.png", { type: "image/png" });
    post.mockResolvedValueOnce({ data: { uploadUrl: "https://s3.example/upload", fileUrl: "https://s3.example/image" } } as never);
    post.mockResolvedValueOnce({ data: { id: "report-1" } } as never);
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    await expect(createSubmission({ type: "report", subject: " Bug ", message: " Broken ", evidenceFile: file })).resolves.toEqual({ id: "report-1" });
    expect(post).toHaveBeenNthCalledWith(1, "/api/submissions/evidence-image", { contentType: "image/png", fileName: "bug.png" });
    expect(fetch).toHaveBeenCalledWith("https://s3.example/upload", { method: "PUT", headers: { "Content-Type": "image/png" }, body: file });
    expect(post).toHaveBeenNthCalledWith(2, "/api/reports", { subject: "Bug", message: "Broken", evidenceImageUrl: "https://s3.example/image" });
  });

  it("does not create a submission when the image upload fails", async () => {
    post.mockResolvedValueOnce({ data: { uploadUrl: "https://s3.example/upload", fileUrl: "https://s3.example/image" } } as never);
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    const file = new File(["image"], "bug.png", { type: "image/png" });
    await expect(createSubmission({ type: "feedback", subject: "", message: "Issue", evidenceFile: file })).rejects.toMatchObject({ stage: "upload" });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid images and blank messages before any request", async () => {
    const file = new File(["text"], "notes.txt", { type: "text/plain" });
    await expect(createSubmission({ type: "feedback", subject: "", message: "Issue", evidenceFile: file })).rejects.toBeInstanceOf(SubmissionError);
    await expect(createSubmission({ type: "feedback", subject: "", message: "   " })).rejects.toMatchObject({ stage: "validation" });
    expect(post).not.toHaveBeenCalled();
  });
});
