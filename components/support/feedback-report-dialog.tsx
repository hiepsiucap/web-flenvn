"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Modal, ModalBody, ModalContent, ModalDescription, ModalHeader, ModalTitle,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HttpError } from "@/lib/http";
import {
  createSubmission,
  getMySubmissions,
  validateEvidenceImage,
  type Submission,
  type SubmissionType,
} from "@/lib/submissions";

const statusLabels = {
  pending: "Pending",
  in_review: "In review",
  resolved: "Resolved",
  rejected: "Rejected",
};

export function FeedbackReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [available, setAvailable] = useState(true);
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [type, setType] = useState<SubmissionType>("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      setItems(await getMySubmissions());
      setAvailable(true);
    } catch (caught) {
      if (caught instanceof HttpError && caught.status === 404) {
        setAvailable(false);
      } else {
        setListError("Could not load your messages. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) queueMicrotask(() => void refresh());
  }, [open, refresh]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSending(true);
    try {
      await createSubmission({ type, subject, message, evidenceFile: file });
      setSubject("");
      setMessage("");
      setFile(null);
      setFileKey((key) => key + 1);
      setSuccess("Your message was sent. You can track its status below.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-xl">
        <ModalHeader>
          <ModalTitle>Feedback and reports</ModalTitle>
          <ModalDescription>Share an idea or tell us about a problem.</ModalDescription>
        </ModalHeader>
        <ModalBody>
          {!available ? (
            <div role="status">
              <p>This feature is not available yet. Please check back soon.</p>
              <Button className="mt-3" variant="outline" onClick={() => void refresh()}>Try again</Button>
            </div>
          ) : (
          <>
          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset disabled={sending || loading} className="space-y-5 disabled:opacity-60">
              <div className="space-y-2">
                <span className="text-sm font-medium">Message type</span>
                <div className="flex gap-4">
                  {(["feedback", "report"] as const).map((option) => (
                    <Label key={option} className="cursor-pointer gap-2">
                      <input type="radio" name="submission-type" value={option} checked={type === option} onChange={() => setType(option)} />
                      {option === "feedback" ? "Feedback" : "Report a problem"}
                    </Label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="submission-subject">Subject (optional)</Label>
                <Input id="submission-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={150} placeholder="A short title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submission-message">Message</Label>
                <Textarea id="submission-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} required rows={5} placeholder="Tell us what happened or what we could improve" />
                <p className="text-xs text-muted-foreground">{message.length}/5000 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="submission-image">Screenshot (optional)</Label>
                <Input key={fileKey} id="submission-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  try {
                    if (selected) validateEvidenceImage(selected);
                    setFile(selected);
                    setError("");
                  } catch (caught) {
                    setFile(null);
                    event.target.value = "";
                    setError(caught instanceof Error ? caught.message : "Choose a valid image.");
                  }
                }} />
                <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP, up to 5 MB.</p>
              </div>
            </fieldset>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            {success && <p className="text-sm text-primary" role="status">{success}</p>}
            <Button type="submit" disabled={sending || loading || !message.trim()}>{sending ? "Sending…" : "Send message"}</Button>
          </form>

          <div className="mt-8 border-t border-border pt-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold">My feedback and reports</h3>
              <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || sending}>Refresh</Button>
            </div>
            {listError && <p className="mt-4 text-sm text-destructive" role="alert">{listError}</p>}
            {loading ? <p className="mt-4 text-muted-foreground">Loading…</p> : items.length === 0 && !listError ? <p className="mt-4 text-muted-foreground">No messages yet.</p> : (
              <ul className="mt-4 divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id} className="py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.subject || (item.type === "report" ? "Problem report" : "Feedback")}</span>
                      <Badge variant="secondary">{item.type === "report" ? "Report" : "Feedback"}</Badge>
                      <Badge variant="outline">{statusLabels[item.status] ?? item.status}</Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p>
                    {item.evidenceImageUrl && (
                      <a href={item.evidenceImageUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
                        {/* S3 evidence hosts vary by environment, so the image is intentionally unoptimized. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.evidenceImageUrl} alt="Attached screenshot" className="max-h-40 max-w-60 rounded-md object-contain" loading="lazy" />
                      </a>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString()}</time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
