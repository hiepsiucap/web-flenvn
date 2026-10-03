import { describe, expect, it } from "vitest";

import {
  IMMERSIVE_DASHBOARD_PADDING,
  IMMERSIVE_DASHBOARD_ROOT,
  isImmersiveDashboardRoute,
  shouldShowMobileDashboardNavigation,
} from "@/lib/dashboard-layout";

describe("dashboard layout", () => {
  it("uses the immersive shell for the AI chat page", () => {
    expect(isImmersiveDashboardRoute("/vocabulary")).toBe(true);
  });

  it("keeps standard content spacing on other pages", () => {
    expect(isImmersiveDashboardRoute("/dashboard")).toBe(false);
    expect(isImmersiveDashboardRoute("/books/book-1")).toBe(false);
  });

  it("uses a small responsive gutter for the immersive page", () => {
    expect(IMMERSIVE_DASHBOARD_PADDING).toBe("p-0 lg:p-3");
  });

  it("locks the immersive page to the viewport", () => {
    expect(IMMERSIVE_DASHBOARD_ROOT).toBe(
      "h-dvh overflow-hidden overscroll-none",
    );
  });

  it("hides mobile dashboard navigation on the standalone chat page", () => {
    expect(shouldShowMobileDashboardNavigation("/vocabulary")).toBe(false);
    expect(shouldShowMobileDashboardNavigation("/dashboard")).toBe(true);
  });
});
