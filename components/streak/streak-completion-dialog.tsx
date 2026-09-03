"use client";

import Image from "next/image";

import { Modal, ModalActionButton, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import streakImage from "@/img/streak.png";
import type { StreakProgress } from "@/lib/streak-types";

export function StreakCompletionDialog({ progress, onComplete }: { progress: StreakProgress; onComplete: () => void }) {
  return (
    <Modal open onOpenChange={(open) => { if (!open) onComplete(); }}>
      <ModalContent className="sm:max-w-sm">
        <ModalHeader><ModalTitle>Daily goal complete</ModalTitle></ModalHeader>
        <ModalBody className="justify-items-center text-center">
          <span className="grid size-16 place-items-center rounded-full border border-primary/30 text-primary">
            <Image src={streakImage} alt="" className="size-12 object-contain" />
          </span>
          <div><p className="text-2xl font-extrabold">{progress.currentStreak}-day streak</p><p className="mt-1 text-sm font-semibold text-muted-foreground">{progress.todayScore} / {progress.dailyTarget} points today</p></div>
          <p className="text-sm font-semibold text-primary">You protected your streak!</p>
        </ModalBody>
        <ModalFooter><ModalActionButton type="button" onClick={onComplete}>Done</ModalActionButton></ModalFooter>
      </ModalContent>
    </Modal>
  );
}
