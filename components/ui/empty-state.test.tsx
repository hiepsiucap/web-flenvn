import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("keeps an empty state actionable and accessible", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="No books yet"
        description="Create a book to get started."
        action={<button type="button">Create book</button>}
        variant="panel"
      />
    );

    expect(html).toMatch(/aria-labelledby="[^"]+"/);
    expect(html).toContain("No books yet");
    expect(html).toContain("Create book");
  });

  it("renders a compact state without an illustration", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No recent videos" variant="compact" />
    );

    expect(html).toContain("No recent videos");
    expect(html).not.toContain("<img");
  });
});
