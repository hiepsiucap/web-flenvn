import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatMessageContent } from "@/components/vocabulary/chat-message-content";

describe("ChatMessageContent", () => {
  it("renders Gemini Markdown as semantic headings, lists, and emphasis", () => {
    const html = renderToStaticMarkup(
      <ChatMessageContent
        content={'### Small talk\n\n* **"How is your day?"**\n* "Any weekend plans?"\n\n---\n\n**Let\'s practice!**'}
      />,
    );

    expect(html).toContain("<h3");
    expect(html).toContain("<ul");
    expect(html).toContain("<strong");
    expect(html).toContain("<hr");
    expect(html).not.toContain("### Small talk");
  });
});
