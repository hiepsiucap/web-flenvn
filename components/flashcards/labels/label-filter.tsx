"use client";

import { CaretDown, X } from "@phosphor-icons/react";

import { Chip } from "@/components/ui/chip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import type { LabelCatalogItem, LabelFilterMode, LabelType } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const VISIBLE_LABEL_LIMIT = 12;
const cefrOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];
const groups: { type: LabelType; label: string }[] = [
  { type: "level", label: "Level" },
  { type: "topic", label: "Topic" },
  { type: "usage", label: "Usage" },
  { type: "custom", label: "Custom" },
];

export function LabelFilter({ labels, selectedIds, mode, onChange }: {
  labels: LabelCatalogItem[];
  selectedIds: string[];
  mode: LabelFilterMode;
  onChange: (selectedIds: string[], mode: LabelFilterMode) => void;
}) {
  const orderedLabels = labels
    .map((label, index) => ({ label, index }))
    .sort((left, right) => {
      const leftLevel = left.label.type === "level";
      const rightLevel = right.label.type === "level";

      if (leftLevel !== rightLevel) return leftLevel ? -1 : 1;
      if (!leftLevel) return left.index - right.index;

      const leftName = (left.label.normalizedName ?? left.label.name).toUpperCase();
      const rightName = (right.label.normalizedName ?? right.label.name).toUpperCase();
      const leftRank = cefrOrder.indexOf(leftName);
      const rightRank = cefrOrder.indexOf(rightName);

      if (leftRank === -1 && rightRank === -1) return left.index - right.index;
      if (leftRank === -1) return 1;
      if (rightRank === -1) return -1;
      return leftRank - rightRank;
    })
    .map(({ label }) => label);
  const visibleLabels = orderedLabels.slice(0, VISIBLE_LABEL_LIMIT);
  const overflowLabels = orderedLabels.slice(VISIBLE_LABEL_LIMIT);

  function toggleLabel(labelId: string, checked?: boolean) {
    const shouldSelect = checked ?? !selectedIds.includes(labelId);
    onChange(shouldSelect
      ? [...new Set([...selectedIds, labelId])]
      : selectedIds.filter((id) => id !== labelId), mode);
  }

  if (!labels.length) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label="Filter flashcards by label">
      {visibleLabels.map((label) => {
        const selected = selectedIds.includes(label.id);
        return (
          <Chip
            key={label.id}
            selected={selected}
            onClick={() => toggleLabel(label.id)}
            className={cn(
              "border-foreground/20 bg-card text-foreground hover:bg-muted",
              selected && "border-foreground bg-foreground text-background shadow-sm hover:bg-foreground/85"
            )}
            title={`${selected ? "Remove" : "Filter by"} ${label.name}`}
          >
            <span className="truncate">{label.name}</span>
          </Chip>
        );
      })}

      {overflowLabels.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Chip>
              More <Icon icon={CaretDown} size="sm" />
            </Chip>
          } />
          <DropdownMenuContent className="w-72" align="start">
            {groups.map((group, groupIndex) => {
              const options = overflowLabels.filter((label) => label.type === group.type);
              if (!options.length) return null;
              return (
                <DropdownMenuGroup key={group.type}>
                  {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  {options.map((label) => (
                    <DropdownMenuCheckboxItem
                      key={label.id}
                      checked={selectedIds.includes(label.id)}
                      onCheckedChange={(checked) => toggleLabel(label.id, checked)}
                      onClick={(event) => event.preventDefault()}
                    >
                      <span className="min-w-0 flex-1 truncate">{label.name}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {selectedIds.length > 1 ? (
        <div className="ml-1 inline-flex rounded-full border border-border p-0.5" aria-label="Label matching mode">
          {(["any", "all"] as const).map((value) => (
            <Chip
              key={value}
              selected={mode === value}
              onClick={() => onChange(selectedIds, value)}
              className={cn(
                "h-7 border-0 px-3 capitalize text-muted-foreground shadow-none",
                mode === value && "bg-primary text-primary-foreground ring-0"
              )}
            >
              {value}
            </Chip>
          ))}
        </div>
      ) : null}

      {selectedIds.length ? (
        <Chip onClick={() => onChange([], "any")} className="border-transparent bg-transparent text-muted-foreground">
          <Icon icon={X} size="sm" /> Clear
        </Chip>
      ) : null}
    </div>
  );
}
