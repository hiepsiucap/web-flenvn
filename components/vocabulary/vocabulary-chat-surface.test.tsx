import { renderToStaticMarkup } from "react-dom/server";
import { ArrowLeft, DotsThreeVertical } from "@phosphor-icons/react";
import { describe, expect, it } from "vitest";

import { Icon } from "@/components/ui/icon";
import {
  CHAT_COMPOSER_INPUT_CLASS,
  CHAT_COMPOSER_WIDTH_CLASS,
  CHAT_CONVERSATION_TITLE_CLASS,
  CHAT_THREAD_WIDTH_CLASS,
  VocabularyChat,
} from "@/components/vocabulary/vocabulary-chat";

describe("VocabularyChat surface", () => {
  it("uses a wider conversation column", () => {
    expect(CHAT_THREAD_WIDTH_CLASS).toBe("max-w-5xl");
  });

  it("uses the full available width for the chat composer", () => {
    expect(CHAT_COMPOSER_WIDTH_CLASS).toBe("w-full");
  });

  it("defaults new chats to English", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);

    expect(html).toContain("English");
    expect(html).not.toContain(">Vietnamese</button>");
  });

  it("adds vertical breathing room around typed text", () => {
    expect(CHAT_COMPOSER_INPUT_CLASS).toContain("pt-3");
  });

  it("truncates long conversation names in the sidebar", () => {
    expect(CHAT_CONVERSATION_TITLE_CLASS).toBe(
      "block w-full truncate font-medium",
    );
  });

  it("provides a mobile back button", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);

    expect(html).toContain('aria-label="Go back"');
    expect(html).toContain("lg:hidden");
  });

  it("renders both mobile header actions without borders and with bold icons", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);
    const boldBackIcon = renderToStaticMarkup(
      <Icon icon={ArrowLeft} weight="bold" />,
    );
    const boldDetailsIcon = renderToStaticMarkup(
      <Icon icon={DotsThreeVertical} weight="bold" />,
    );

    expect(html.match(/size-9 shrink-0 rounded-full border-0 shadow-sm shadow-foreground\/10 lg:hidden/g))
      .toHaveLength(2);
    expect(html).toContain(boldBackIcon);
    expect(html).toContain(boldDetailsIcon);
  });

  it("keeps mobile chat details behind an expandable icon", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);

    expect(html).toContain('aria-label="Chat details"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('id="mobile-chat-details"');
  });

  it("fills the available page width without outer spacing", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);
    const rootClasses = html.match(/^<div class="([^"]+)"/)?.[1] ?? "";

    expect(rootClasses).toContain("h-dvh");
    expect(rootClasses).toContain("w-full");
    expect(rootClasses).not.toContain("max-w-");
    expect(rootClasses).not.toContain("mx-auto");
    expect(rootClasses).not.toContain("lg:border-");
  });

  it("keeps structural sections borderless", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);

    expect(html).not.toContain("border-r-2 border-border/20");
    expect(html).not.toContain("border-b-2 border-border/20");
    expect(html).not.toContain("border-t-2 border-border/20");
  });

  it("uses borderless chat controls", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);

    expect(html).not.toContain("border-border bg-background");
    expect(html).not.toContain("border-input bg-transparent");
    expect(html).not.toContain("border-border/30");
  });

  it("does not display provider branding in the chat header", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);

    expect(html).not.toContain("Powered by Gemini");
    expect(html).not.toContain("Gemini can make mistakes");
  });
});
