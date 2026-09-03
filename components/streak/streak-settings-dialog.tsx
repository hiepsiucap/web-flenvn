"use client";

import { useState, type ReactElement } from "react";

import { useStreak } from "@/components/streak/streak-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalActionButton, ModalBody, ModalCancelButton, ModalContent, ModalFooter, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import type { ApiEnvelope } from "@/lib/auth-types";
import { HttpError, http } from "@/lib/http";
import type { UpdateStreakSettingsResponse } from "@/lib/streak-types";

const targetPresets = [1000, 5000, 10000, 20000];

export function StreakSettingsDialog({ trigger }: { trigger: ReactElement }) {
  const { status, refreshStreak } = useStreak();
  const [target, setTarget] = useState(status?.nextDailyTarget ?? status?.dailyTarget ?? 1000);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function handleOpenChange(open: boolean) {
    if (open) {
      setTarget(status?.nextDailyTarget ?? status?.dailyTarget ?? 1000);
      setError("");
      void refreshStreak();
    }
  }

  async function save() {
    if (!Number.isInteger(target) || target < 1000 || target > 20000) {
      setError("Daily target must be a whole number from 1,000 to 20,000.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await http.patch<ApiEnvelope<UpdateStreakSettingsResponse> | UpdateStreakSettingsResponse, { dailyTarget: number }>("/api/streak/settings", { dailyTarget: target });
      await refreshStreak();
    } catch (caught) {
      const data = caught instanceof HttpError ? caught.data as { message?: string | string[] } | null : null;
      setError(Array.isArray(data?.message) ? data.message.join(", ") : data?.message ?? "Could not update your daily goal.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal onOpenChange={handleOpenChange}>
      <ModalTrigger render={trigger} />
      <ModalContent className="sm:max-w-sm">
        <ModalHeader><ModalTitle>Daily goal settings</ModalTitle></ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-2 gap-2">
            {targetPresets.map((value) => <Button key={value} type="button" variant={target === value ? "default" : "outline"} onClick={() => setTarget(value)}>{value.toLocaleString()}</Button>)}
          </div>
          <div className="grid gap-1.5"><Label htmlFor="daily-target-setting">Custom target</Label><Input id="daily-target-setting" type="number" min={1000} max={20000} value={target} onChange={(event) => setTarget(Number(event.target.value))} /></div>
          <div className="grid gap-1.5"><Label>Timezone</Label><p className="rounded-lg border border-input px-2.5 py-2 text-sm text-muted-foreground">{status?.timezone ?? "Not available"}</p></div>
          {status?.nextDailyTarget && <p className="text-xs font-semibold text-primary">{status.nextDailyTarget.toLocaleString()} points per day starting {status.targetEffectiveDate}.</p>}
          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        </ModalBody>
        <ModalFooter><ModalCancelButton>Cancel</ModalCancelButton><ModalActionButton type="button" disabled={isSaving} onClick={() => void save()}>{isSaving ? "Saving…" : "Save for tomorrow"}</ModalActionButton></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
