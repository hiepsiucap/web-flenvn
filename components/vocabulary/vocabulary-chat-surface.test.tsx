import { renderToStaticMarkup } from "react-dom/server";
import { ArrowLeft, DotsThreeVertical } from "@phosphor-icons/react";
import { describe, expect, it } from "vitest";

import { Icon } from "@/components/ui/icon";
import {
  CHAT_CONVERSATION_TITLE_CLASS,
  CHAT_THREAD_WIDTH_CLASS,
  VocabularyChat,
} from "@/components/vocabulary/vocabulary-chat";

describe("VocabularyChat surface", () => {
  it("uses a wider conversation column", () => {
    expect(CHAT_THREAD_WIDTH_CLASS).toBe("max-w-5xl");
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

  it("renders both mobile header actions with ultra-soft borders, shadows, and bold icons", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);
    const boldBackIcon = renderToStaticMarkup(
      <Icon icon={ArrowLeft} weight="bold" />,
    );
    const boldDetailsIcon = renderToStaticMarkup(
      <Icon icon={DotsThreeVertical} weight="bold" />,
    );

    expect(html.match(/size-9 shrink-0 rounded-full border border-border\/20 shadow-sm shadow-foreground\/10 lg:hidden/g))
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

  it("uses a soft shadow and subtle outer border", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);
    const rootClasses = html.match(/^<div class="([^"]+)"/)?.[1] ?? "";

    expect(rootClasses).toContain("h-dvh");
    expect(rootClasses).toContain("lg:shadow-md");
    expect(rootClasses).toContain("lg:shadow-foreground/10");
    expect(rootClasses).toContain("lg:border-2");
    expect(rootClasses).toContain("lg:border-border/20");
  });

  it("uses soft theme borders for structural dividers", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);

    expect(html).toContain("border-r-2 border-border/20");
    expect(html).toContain("border-b-2 border-border/20");
    expect(html).toContain("border-t-2 border-border/20");
  });

  it("uses soft gray borders for interactive controls", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);

    expect(html).not.toContain("border-border bg-background");
    expect(html).not.toContain("border-input bg-transparent");
    expect(html).toContain("border-border/30");
  });

  it("does not display provider branding in the chat header", () => {
    const html = renderToStaticMarkup(<VocabularyChat />);

    expect(html).not.toContain("Powered by Gemini");
    expect(html).not.toContain("Gemini can make mistakes");
  });
});
