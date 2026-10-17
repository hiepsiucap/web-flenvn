import { http } from "@/lib/http";

export type SubmissionType = "feedback" | "report";
export type SubmissionStatus = "pending" | "in_review" | "resolved" | "rejected";

export type Submission = {
  id: string;
  type: SubmissionType;
  subject: string | null;
  message: string;
  status: SubmissionStatus;
  evidenceImageUrl: string | null;
  createdAt: string;
};

type ApiResponse<T> = { data: T };
type PresignedImage = { uploadUrl: string; fileUrl: string };

export class SubmissionError extends Error {
  constructor(public stage: "validation" | "presign" | "upload" | "create", message: string) {
    super(message);
    this.name = "SubmissionError";
  }
}

export function validateEvidenceImage(file: File): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new SubmissionError("validation", "Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new SubmissionError("validation", "Choose an image smaller than 5 MB.");
  }
}

export async function getMySubmissions(): Promise<Submission[]> {
  const response = await http.get<ApiResponse<Submission[]>>( "/api/submissions/mine");
  return response.data;
}

export async function createSubmission(input: {
  type: SubmissionType;
  subject: string;
  message: string;
  evidenceFile?: File | null;
}): Promise<Submission> {
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!message || message.length > 5000 || subject.length > 150) {
    throw new SubmissionError("validation", "Enter a message (1–5000 characters) and a subject under 150 characters.");
  }

  let evidenceImageUrl: string | undefined;
  if (input.evidenceFile) {
    validateEvidenceImage(input.evidenceFile);
    let presigned: PresignedImage;
    try {
      const response = await http.post<ApiResponse<PresignedImage>>(
        "/api/submissions/evidence-image",
        { contentType: input.evidenceFile.type, fileName: input.evidenceFile.name }
      );
      presigned = response.data;
    } catch {
      throw new SubmissionError("presign", "Could not prepare the image upload. Please try again.");
    }
    try {
      const response = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": input.evidenceFile.type },
        body: input.evidenceFile,
      });
      if (!response.ok) throw new Error("Upload failed");
      evidenceImageUrl = presigned.fileUrl;
    } catch {
      throw new SubmissionError("upload", "Could not upload the image. Your message was not sent.");
    }
  }

  try {
    const response = await http.post<ApiResponse<Submission>>(
      input.type === "feedback" ? "/api/feedback" : "/api/reports",
      { ...(subject ? { subject } : {}), message, ...(evidenceImageUrl ? { evidenceImageUrl } : {}) }
    );
    return response.data;
  } catch {
    throw new SubmissionError("create", "Could not send your message. Please try again.");
  }
}
