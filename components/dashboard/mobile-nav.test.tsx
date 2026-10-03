import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MobileNav } from "@/components/dashboard/mobile-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

describe("MobileNav", () => {
  it("does not expose the vocabulary suggestion flow", () => {
    const html = renderToStaticMarkup(<MobileNav />);

    expect(MobileNav).toHaveLength(0);
    expect(html).not.toContain("Suggest vocabulary");
  });
});
