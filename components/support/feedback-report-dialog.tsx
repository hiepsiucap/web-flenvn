"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal, ModalBody, ModalContent, ModalDescription, ModalHeader, ModalTitle,
} from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
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
  const [historyOpen, setHistoryOpen] = useState(false);
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
    } catch {
      setListError("Could not load your submissions. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (historyOpen) queueMicrotask(() => void refresh());
  }, [historyOpen, refresh]);

  function openHistory() {
    onOpenChange(false);
    setHistoryOpen(true);
  }

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
      setSuccess("Your message was sent. View your submissions to track its status.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange}>
        <ModalContent className="sm:max-w-xl">
          <ModalHeader>
            <ModalTitle>Feedback and reports</ModalTitle>
            <ModalDescription>Share an idea or tell us about a problem.</ModalDescription>
          </ModalHeader>
          <ModalBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              <fieldset disabled={sending} className="space-y-5 disabled:opacity-60">
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
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={sending || !message.trim()}>{sending ? "Sending…" : "Send message"}</Button>
                <Button type="button" variant="ghost" onClick={openHistory} disabled={sending}>View my submissions</Button>
              </div>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal open={historyOpen} onOpenChange={setHistoryOpen}>
        <ModalContent className="h-[min(42rem,calc(100dvh-1rem))] sm:max-w-3xl">
          <ModalHeader>
            <ModalTitle>My feedback and reports</ModalTitle>
            <ModalDescription>Check the status of messages you’ve sent.</ModalDescription>
          </ModalHeader>
          <ModalBody>
            {listError && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-destructive" role="alert">{listError}</p>
                <Button variant="outline" size="sm" onClick={() => void refresh()}>Try again</Button>
              </div>
            )}
            {loading ? <p className="text-muted-foreground">Loading…</p> : items.length === 0 && !listError ? <p className="text-muted-foreground">No messages yet.</p> : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-600">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="w-40 px-4 py-3 font-medium">Name</th>
                      <th scope="col" className="px-4 py-3 font-medium">Description</th>
                      <th scope="col" className="w-24 px-4 py-3 font-medium">Status</th>
                      <th scope="col" className="w-28 px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-4">
                          <span className="block break-words font-medium">{item.subject || (item.type === "report" ? "Problem report" : "Feedback")}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{item.type === "report" ? "Report" : "Feedback"}</span>
                        </td>
                        <td className="min-w-0 px-4 py-4">
                          <p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-muted-foreground">{item.message}</p>
                          {item.evidenceImageUrl && (
                            <a href={item.evidenceImageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block" aria-label="View attached screenshot">
                              {/* S3 evidence hosts vary by environment, so the image is intentionally unoptimized. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.evidenceImageUrl} alt="Attached screenshot" className="size-12 rounded-md object-cover" loading="lazy" />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-4"><Badge variant="outline">{statusLabels[item.status] ?? item.status}</Badge></td>
                        <td className="whitespace-nowrap px-4 py-4 text-muted-foreground"><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString()}</time></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
