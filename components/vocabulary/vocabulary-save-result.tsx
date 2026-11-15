import { CheckCircle, WarningCircle } from "@phosphor-icons/react";

import { Icon } from "@/components/ui/icon";
import { StateIllustration } from "@/components/ui/state-illustration";

type VocabularySaveResultProps = {
  saved: number;
  duplicates: number;
  failed: number;
  bookTitle?: string;
  allSaved: boolean;
};

export function VocabularySaveResult({ saved, duplicates, failed, bookTitle, allSaved }: VocabularySaveResultProps) {
  const title = saved > 0
    ? `${saved} ${saved === 1 ? "word" : "words"} saved${bookTitle ? ` to ${bookTitle}` : ""}`
    : failed > 0
      ? "Your vocabulary couldn’t be saved"
      : "These words are already in your books";

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="grid justify-items-center gap-3 py-6 text-center">
      {allSaved && failed === 0 ? (
        <div className="motion-mascot-enter">
          <StateIllustration kind="books" />
        </div>
      ) : null}
      <Icon icon={failed > 0 ? WarningCircle : CheckCircle} weight="fill" className="motion-pop size-9 text-primary" />
      <h3 className="motion-enter motion-delay-1 max-w-md break-words text-lg font-semibold">{title}</h3>
      {allSaved && failed === 0 && saved > 0 ? (
        <p className="motion-enter motion-delay-2 text-sm text-muted-foreground">Ready for your next review.</p>
      ) : null}
      {duplicates > 0 ? (
        <p className="motion-enter motion-delay-2 text-sm text-muted-foreground">{duplicates} {duplicates === 1 ? "word was" : "words were"} already saved.</p>
      ) : null}
      {failed > 0 ? (
        <p className="motion-enter motion-delay-2 text-sm text-destructive">{failed} {failed === 1 ? "word couldn’t" : "words couldn’t"} be saved. Your selections are kept so you can try again.</p>
      ) : null}
    </div>
  );
}
