import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VocabularySaveResult } from "./vocabulary-save-result";

describe("VocabularySaveResult", () => {
  it("celebrates a complete save without listing zero failures or duplicates", () => {
    const html = renderToStaticMarkup(<VocabularySaveResult saved={20} duplicates={0} failed={0} bookTitle="My words" allSaved />);
    expect(html).toContain("20 words saved to My words");
    expect(html).toContain("empty-books.webp");
    expect(html).not.toContain("duplicates");
    expect(html).not.toContain("failed");
  });
  it("keeps partial failures clear without a completion illustration", () => {
    const html = renderToStaticMarkup(<VocabularySaveResult saved={3} duplicates={1} failed={2} allSaved={false} />);
    expect(html).toContain("3 words saved");
    expect(html).toContain("1 word was already saved");
    expect(html).toContain("Your selections are kept");
    expect(html).not.toContain("empty-books.webp");
  });
  it("does not celebrate when nothing was saved", () => {
    const html = renderToStaticMarkup(<VocabularySaveResult saved={0} duplicates={0} failed={2} allSaved={false} />);
    expect(html).toContain("Your vocabulary couldn’t be saved");
    expect(html).not.toContain("0 words saved");
  });
});
