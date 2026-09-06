"use client";

import { useState } from "react";
import { PencilSimple, Plus, Spinner as Loader2 } from "@phosphor-icons/react";
import { toast } from "react-toastify";

import { getFlashcardLabelToneClassName } from "@/components/flashcards/labels/flashcard-label-badges";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalActionButton,
  ModalBody,
  ModalCancelButton,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Tag } from "@/components/ui/tag";
import { Text } from "@/components/ui/text";
import type { ApiEnvelope, ApiErrorResponse } from "@/lib/auth-types";
import type { Flashcard, LabelCatalogItem, LabelType } from "@/lib/dashboard-data";
import { HttpError, http } from "@/lib/http";

const groups: { type: LabelType; name: string }[] = [
  { type: "level", name: "Level" },
  { type: "topic", name: "Topic" },
  { type: "usage", name: "Usage" },
  { type: "custom", name: "Custom" },
];

function unwrap<T>(response: ApiEnvelope<T> | T) {
  return typeof response === "object" && response !== null && "data" in response
    ? response.data
    : response;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return (error.data as ApiErrorResponse | null)?.message ?? fallback;
  }
  return fallback;
}

export function FlashcardLabelEditor({
  card,
  labels,
  onCardChange,
  onLabelCreated,
  onCatalogChange,
}: {
  card: Flashcard;
  labels: LabelCatalogItem[];
  onCardChange: (card: Flashcard) => void;
  onLabelCreated: (label: LabelCatalogItem) => void;
  onCatalogChange: (labels: LabelCatalogItem[]) => void;
}) {
  const currentIds = card.labels?.map((label) => label.id) ?? [];
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(currentIds);
  const [customName, setCustomName] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selectedLabels = selectedIds
    .map((id) => labels.find((label) => label.id === id) ?? card.labels?.find((label) => label.id === id))
    .filter((label): label is LabelCatalogItem => Boolean(label));
  const availableLabels = labels.filter((label) => !selectedIds.includes(label.id));

  function selectLabel(label: LabelCatalogItem) {
    setSelectedIds((ids) => {
      if (label.type !== "level") return [...new Set([...ids, label.id])];

      const levelIds = new Set(
        [
          ...labels,
          ...(card.labels ?? []),
        ]
          .filter((item) => item.type === "level")
          .map((item) => item.id)
      );

      return [...ids.filter((id) => !levelIds.has(id)), label.id];
    });
  }

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) setSelectedIds(currentIds);
    setOpen(nextOpen);
  }

  async function saveLabels() {
    setIsSaving(true);
    try {
      const response = await http.put<ApiEnvelope<Flashcard> | Flashcard>(
        `/api/flashcards/${card.id}/labels`,
        { labelIds: selectedIds }
      );
      onCardChange(unwrap(response));
      setOpen(false);
      try {
        const catalogResponse = await http.get<ApiEnvelope<LabelCatalogItem[]> | LabelCatalogItem[]>(
          "/api/labels",
          { query: { includeCounts: true } }
        );
        onCatalogChange(unwrap(catalogResponse));
      } catch {
        // Counts recover on the next page load if this secondary refresh fails.
      }
      toast.success("Labels updated");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to update labels"));
    } finally {
      setIsSaving(false);
    }
  }

  async function createCustomLabel() {
    const name = customName.trim();
    if (!name) return;
    if (customColor && !/^#[0-9a-f]{6}$/i.test(customColor)) {
      toast.error("Use a six-digit hex color such as #2563EB");
      return;
    }

    setIsCreating(true);
    try {
      const response = await http.post<ApiEnvelope<LabelCatalogItem> | LabelCatalogItem>(
        "/api/labels",
        { name, type: "custom", color: customColor || undefined }
      );
      const label = unwrap(response);
      onLabelCreated(label);
      setSelectedIds((ids) => [...new Set([...ids, label.id])]);
      setCustomName("");
      setCustomColor("");
      toast.success("Custom label created and selected");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to create label"));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="ghost" className="h-6 rounded-full px-2 text-xs" onClick={() => changeOpen(true)}>
        <Icon icon={PencilSimple} size="sm" />
        Edit labels
      </Button>

      <Modal open={open} onOpenChange={changeOpen}>
        <ModalContent className="sm:max-w-2xl">
          <ModalHeader>
            <ModalTitle>Edit labels</ModalTitle>
            <ModalDescription>Add or remove labels for “{card.word}”.</ModalDescription>
          </ModalHeader>

          <ModalBody className="gap-6">
            <section className="grid gap-2" aria-labelledby="selected-labels-title">
              <div className="flex items-baseline justify-between gap-3">
                <Text id="selected-labels-title" weight="semibold">Selected</Text>
                <Text size="xs" tone="muted">{selectedLabels.length} selected</Text>
              </div>
              {selectedLabels.length ? (
                <div className="flex flex-wrap gap-2 rounded-2xl border border-border p-3">
                  {selectedLabels.map((label) => (
                    <Tag
                      key={label.id}
                      size="md"
                      variant="outline"
                      className={getFlashcardLabelToneClassName(label)}
                      onRemove={() => setSelectedIds((ids) => ids.filter((id) => id !== label.id))}
                      removeLabel={`Remove ${label.name}`}
                    >
                      {label.name}
                    </Tag>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border px-4 py-3 text-sm text-muted-foreground">
                  No labels selected. Saving will remove all labels from this flashcard.
                </div>
              )}
            </section>

            <section className="grid gap-3" aria-labelledby="available-labels-title">
              <Text id="available-labels-title" weight="semibold">Available</Text>
              {groups.map((group) => {
                const options = availableLabels.filter((label) => label.type === group.type);
                if (!options.length) return null;
                return (
                  <div key={group.type} className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Text size="xs" weight="semibold" tone="muted" className="uppercase">{group.name}</Text>
                      {group.type === "level" ? (
                        <Text size="xs" tone="muted">Choose one</Text>
                      ) : null}
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {options.map((label) => (
                        <button
                          key={label.id}
                          type="button"
                          className="flex min-w-0 items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm font-medium transition-colors hover:border-foreground/30 hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          onClick={() => selectLabel(label)}
                        >
                          <Icon icon={Plus} size="sm" className="shrink-0 text-muted-foreground" />
                          <span className="truncate">{label.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!availableLabels.length ? (
                <Text size="sm" tone="muted">All available labels are selected.</Text>
              ) : null}
            </section>

            <section className="grid gap-2 border-t border-border pt-4">
              <Label htmlFor={`custom-label-${card.id}`}>Create custom label</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id={`custom-label-${card.id}`}
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="Interview"
                  maxLength={80}
                />
                <Input
                  value={customColor}
                  onChange={(event) => setCustomColor(event.target.value)}
                  placeholder="#2563EB (optional)"
                  aria-label="Custom label color"
                  className="sm:w-44"
                />
                <Button type="button" variant="outline" disabled={isCreating || !customName.trim()} onClick={createCustomLabel}>
                  <Icon icon={isCreating ? Loader2 : Plus} className={isCreating ? "animate-spin" : undefined} />
                  Create
                </Button>
              </div>
            </section>
          </ModalBody>

          <ModalFooter>
            <ModalCancelButton disabled={isSaving}>Cancel</ModalCancelButton>
            <ModalActionButton type="button" disabled={isSaving} onClick={saveLabels}>
              {isSaving ? <Icon icon={Loader2} className="animate-spin" /> : null}
              Save labels
            </ModalActionButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
