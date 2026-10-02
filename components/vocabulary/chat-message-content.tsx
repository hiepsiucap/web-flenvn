import Markdown from "react-markdown";

export function ChatMessageContent({ content }: { content: string }) {
  return (
    <div
      className={[
        "min-w-0 break-words",
        "[&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        "[&_code]:rounded-md [&_code]:bg-background/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-semibold",
        "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold",
        "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-semibold",
        "[&_hr]:my-5 [&_hr]:border-border",
        "[&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-background/70 [&_pre]:p-3",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
      ].join(" ")}
    >
      <Markdown>{content}</Markdown>
    </div>
  );
}
